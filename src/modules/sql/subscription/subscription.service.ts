import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { StripeService } from '@core/stripe';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';

@Injectable()
export class SubscriptionService extends ModelService<Subscription> {
  searchFields: SearchFields<Subscription> = ['stripe_subscription_id', 'stripe_customer_id'];

  constructor(
    db: SqlService<Subscription>,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {
    super(db);
  }

  /**
   * Create Stripe checkout session for one-time payment
   * Backend will handle subscription logic, not Stripe
   */
  async createCheckoutSession(
    userId: number,
    userEmail: string,
    amount: number, // in dollars
    planType: string,
  ) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3001';

    try {
      const session = await this.stripeService.stripe.checkout.sessions.create({
        mode: 'payment', // One-time payment, NOT subscription
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Chat Access - ${planType}`,
                description: 'One month chat access',
              },
              unit_amount: amount * 100, // Convert to cents
            },
            quantity: 1,
          },
        ],
        success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/subscription/cancel`,
        customer_email: userEmail,
        metadata: {
          userId: userId.toString(),
          planType,
        },
      });

      return { error: null, data: session };
    } catch (error) {
      return { error, data: null };
    }
  }

  /**
   * Process successful payment and activate subscription
   */
  async processPayment(sessionId: string) {
    try {
      const session = await this.stripeService.stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return { error: new Error('Payment not completed'), data: null };
      }

      const userId = parseInt(session.metadata.userId);
      const planType = session.metadata.planType;
      const amount = session.amount_total / 100; // Convert from cents

      // Calculate subscription period (1 month)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // Create or update subscription in YOUR database
      const { data: existing } = await this.findOne({
        owner: { id: userId } as any,
        action: 'findOne',
        payload: {
          where: { user_id: userId },
          sort: [['created_at', 'desc']],
        },
      });

      if (existing) {
        // Extend existing subscription
        return this.update({
          owner: { id: userId } as any,
          action: 'update',
          id: existing.id,
          body: {
            status: SubscriptionStatus.ACTIVE,
            current_period_start: now,
            current_period_end: periodEnd,
            amount,
            stripe_customer_id: session.customer as string,
          },
          payload: {},
        });
      }

      // Create new subscription
      return this.create({
        owner: { id: userId } as any,
        action: 'create',
        body: {
          user_id: userId,
          stripe_subscription_id: session.id, // Store session ID for reference
          stripe_customer_id: session.customer as string,
          status: SubscriptionStatus.ACTIVE,
          plan_type: planType,
          current_period_start: now,
          current_period_end: periodEnd,
          amount,
          currency: 'usd',
        },
        payload: {},
      });
    } catch (error) {
      return { error, data: null };
    }
  }

  /**
   * Check if user has active chat access
   */
  async checkChatAccess(userId: number): Promise<boolean> {
    const { data: subscription } = await this.findOne({
      owner: { id: userId } as any,
      action: 'findOne',
      payload: {
        where: {
          user_id: userId,
          status: SubscriptionStatus.ACTIVE,
        },
      },
    });

    if (!subscription) return false;

    /**
     * Check if subscription is still valid
     */
    const now = new Date();
    return (
      subscription.status === SubscriptionStatus.ACTIVE &&
      now < subscription.current_period_end
    );
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: number) {
    const { data: subscription } = await this.findOne({
      owner: { id: userId } as any,
      action: 'findOne',
      payload: {
        where: {
          user_id: userId,
        },
        sort: [['created_at', 'desc']],
      },
    });

    return subscription;
  }



  /**
   * Cancel user subscription (backend-only, no Stripe interaction)
   */
  async cancelUserSubscription(userId: number) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return { error: new Error('No subscription found') };
    }

    // Update in database only (no Stripe cancellation needed for one-time payments)
    return this.update({
      owner: { id: userId } as any,
      action: 'update',
      id: subscription.id,
      body: {
        status: SubscriptionStatus.CANCELLED,
      },
      payload: {},
    });
  }
}