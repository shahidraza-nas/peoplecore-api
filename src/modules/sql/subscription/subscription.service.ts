import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { StripeService } from '@core/stripe';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';

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
    owner: OwnerDto,
    createCheckoutDto: any,
  ) {
    const userId = owner.id;
    const userEmail = owner.email;
    const amount = createCheckoutDto.amount || 10; // Default $10
    const planType = createCheckoutDto.planType || 'chat_monthly';
    const frontendUrl = this.configService.get('FRONTEND_URL');

    try {
      /**
       * Check if user already has an active subscription
       */
      const hasActiveSubscription = await this.isSubscriptionActive(owner);
      if (hasActiveSubscription) {
        return {
          error: new Error('You already have an active subscription'),
          data: null,
        };
      }

      /**
       * Create or retrieve Stripe customer using StripeService helper
       */
      const customerId = await this.stripeService.createOrUpdateCustomer(userEmail, {
        userId,
        userUid: owner.uid,
        name: owner.name || `${owner.first_name} ${owner.last_name}`,
        phone: owner.phone ? `${owner.phone_code}${owner.phone}` : undefined,
        role: owner.role,
        description: `PeopleCore User - ${owner.role}`,
      });

      const session = await this.stripeService.stripe.checkout.sessions.create({
        mode: 'payment', // One-time payment
        payment_method_types: ['card'],
        customer: customerId,
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
        metadata: {
          userId: userId.toString(),
          userUid: owner.uid,
          userEmail: userEmail,
          userName: owner.name || `${owner.first_name} ${owner.last_name}`,
          planType,
          amount: amount.toString(),
          createdAt: new Date().toISOString(),
        },
      });

      return { error: null, data: session };
    } catch (error) {
      console.error('Checkout session creation failed:', error.message);
      if (error.type === 'StripeInvalidRequestError') {
        return {
          error: new Error('Invalid payment request. Please check your details and try again.'),
          data: null
        };
      }
      if (error.type === 'StripeAPIError') {
        return {
          error: new Error('Payment service temporarily unavailable. Please try again later.'),
          data: null
        };
      }
      return {
        error: new Error(error.message || 'Failed to create payment session'),
        data: null
      };
    }
  }

  /**
   * Process successful payment and activate subscription
   * Always creates a NEW subscription record to maintain history
   * Idempotent: Prevents duplicate processing of the same session
   */
  async processPayment(sessionId: string) {
    try {
      /**
       * Check if this session was already processed (idempotency)
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: sessionId },
        },
      });

      if (existing) {
        return { error: null, data: existing };
      }

      const session = await this.stripeService.stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return { error: new Error('Payment not completed'), data: null };
      }

      const userId = parseInt(session.metadata.userId);
      const planType = session.metadata.planType;
      const amount = session.amount_total / 100; // Convert from cents

      /**
       * Calculate subscription period (1 month)
       */
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      /**
       * Always create NEW subscription record for history tracking
       * Old subscriptions remain in database with their final status
       */
      return this.create({
        owner: { id: userId } as any,
        action: 'create',
        body: {
          user_id: userId,
          stripe_subscription_id: session.id,
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
   * Includes 3-day grace period after expiration
   * Updates status to EXPIRED if grace period has ended
   */
  async checkChatAccess(owner: OwnerDto): Promise<boolean> {
    const { data: subscription } = await this.findOne({
      owner,
      action: 'findOne',
      payload: {
        where: {
          user_id: owner.id,
        },
        sort: [['created_at', 'desc']],
      },
    });

    if (!subscription) return false;

    /**
     * Only check ACTIVE subscriptions
     */
    if (subscription.status !== SubscriptionStatus.ACTIVE) return false;

    const now = new Date();
    const gracePeriodEnd = new Date(subscription.current_period_end);
    /**
     * 3-day grace period
     */
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);

    /**
     * If grace period has ended, mark as expired
     */
    if (now >= gracePeriodEnd) {
      await this.update({
        owner,
        action: 'update',
        id: subscription.id,
        body: {
          status: SubscriptionStatus.EXPIRED,
        },
        payload: {},
      });
      return false;
    }
    return true;
  }
  /**
   * Get user's active subscription
   */
  async getUserSubscription(owner: OwnerDto) {
    const { data: subscription } = await this.findOne({
      owner,
      action: 'findOne',
      payload: {
        where: {
          user_id: owner.id,
        },
        sort: [['created_at', 'desc']],
      },
    });

    return subscription;
  }



  /**
   * Cancel user subscription (backend-only, no Stripe interaction)
   */
  async cancelUserSubscription(owner: OwnerDto) {
    const subscription = await this.getUserSubscription(owner);

    if (!subscription) {
      return { error: new Error('No subscription found') };
    }

    // Update in database only (no Stripe cancellation needed for one-time payments)
    return this.update({
      owner,
      action: 'update',
      id: subscription.id,
      body: {
        status: SubscriptionStatus.CANCELLED,
        cancelled_at: new Date(),
      },
      payload: {},
    });
  }

  /**
   * Determines whether a user's subscription is currently active.
   *
   * @param owner - The owner information containing the user's ID.
   * @returns A promise that resolves to `true` if the user's subscription is active and the current date is before the subscription's period end; otherwise, `false`.
   */
  async isSubscriptionActive(owner: OwnerDto): Promise<boolean> {
    const subscription = await this.getUserSubscription(owner);
    if (!subscription) return false;

    const now = new Date();
    const validStatuses = [SubscriptionStatus.ACTIVE];

    return validStatuses.includes(subscription.status) && now < subscription.current_period_end;
  }

  /**
   * Checks if a user currently has an active subscription.
   * Includes cancelled but still valid subscriptions.
   * Usage: Used in chat/chat.guard.ts as:
   *   const hasAccess = await this.subscriptionService.isSubscriptionActive(user.id);
   *
   * Retrieves the user's subscription information and determines if the current date
   * is before the end of the current subscription period.
   *
   * @param userId - The unique identifier of the user to check subscription status for.
   * @returns A promise that resolves to `true` if the user is subscribed, or `false` otherwise.
   */
  async isSubscribed(owner: OwnerDto): Promise<boolean> {
    const subscription = await this.getUserSubscription(owner);
    if (!subscription) return false;
    const now = new Date();
    return now < subscription.current_period_end;
  }

  /**
   * Get subscription metrics and analytics
   * Returns counts by status and total revenue
   */
  async getSubscriptionMetrics() {
    try {
      const [activeResult, expiredResult, cancelledResult, totalResult] = await Promise.all([
        this.getCount({
          owner: { id: 0 } as any,
          action: 'getCount',
          payload: { where: { status: SubscriptionStatus.ACTIVE } },
        }),
        this.getCount({
          owner: { id: 0 } as any,
          action: 'getCount',
          payload: { where: { status: SubscriptionStatus.EXPIRED } },
        }),
        this.getCount({
          owner: { id: 0 } as any,
          action: 'getCount',
          payload: { where: { status: SubscriptionStatus.CANCELLED } },
        }),
        this.getCount({
          owner: { id: 0 } as any,
          action: 'getCount',
          payload: {},
        }),
      ]);

      // Calculate total revenue from active subscriptions
      const activeSubscriptions = await this.findAll({
        owner: { id: 0 } as any,
        action: 'findAll',
        payload: {
          where: { status: SubscriptionStatus.ACTIVE },
          select: ['amount'],
        },
      });

      const monthlyRecurringRevenue = activeSubscriptions.data?.reduce(
        (sum, sub) => sum + Number(sub.amount || 0),
        0,
      ) || 0;

      return {
        error: null,
        data: {
          activeSubscriptions: activeResult.count || 0,
          expiredSubscriptions: expiredResult.count || 0,
          cancelledSubscriptions: cancelledResult.count || 0,
          totalSubscriptions: totalResult.count || 0,
          monthlyRecurringRevenue: parseFloat(monthlyRecurringRevenue.toFixed(2)),
        },
      };
    } catch (error) {
      return { error, data: null };
    }
  }

  /**
   * Retrieves the subscription history for a specific user (owner).
   *
   * @param owner - The owner information containing the user's ID.
   * @param query - Optional query parameters to filter, sort, or paginate the results.
   * @returns A promise that resolves to the user's subscription history, or an error object if the operation fails.
   */
  async getUserHistory(owner: OwnerDto, query: any = {}) {
    try {
      const result = await this.findAll({
        owner: owner,
        action: 'findAll',
        payload: {
          ...query,
          where: {
            ...(query.where || {}),
            user_id: owner.id,
          },
          sort: query.sort || [['created_at', 'desc']],
        },
      });

      return result;
    } catch (error) {
      return { error, data: null, count: 0 };
    }
  }

  /**
   * Handle Stripe webhook events
   * Verifies signature and processes different event types
   * @param rawBody Raw request body buffer
   * @param signature Stripe signature from headers
   * @returns Error object or null
   */
  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get('stripe').webhookSecret;

    try {
      /**
       * Verify webhook signature to ensure request is from Stripe
       */
      const event = this.stripeService.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );

      /**
       * Handle different event types
       */
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object);
          break;

        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }

      return { error: null };
    } catch (error) {
      console.error('Webhook signature verification failed:', error.message);
      return { error };
    }
  }

  /**
   * Handle successful checkout completion
   * Automatically creates subscription when payment succeeds
   * This replaces the manual processPayment endpoint for better reliability
   * @param session Stripe checkout session object
   */
  private async handleCheckoutCompleted(session: any) {
    try {
      console.log(`Processing checkout.session.completed: ${session.id}`);
      
      /**
       * Check if this session was already processed (idempotency)
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: session.id },
        },
      });

      if (existing) {
        console.log(`Session ${session.id} already processed`);
        return;
      }

      /**
       * Verify payment was successful
       */
      if (session.payment_status !== 'paid') {
        console.log(`Session ${session.id} payment not completed: ${session.payment_status}`);
        return;
      }

      /**
       * Validate required metadata
       */
      if (!session.metadata || !session.metadata.userId || !session.metadata.planType) {
        console.log(`Session ${session.id} missing required metadata (userId or planType). This is normal for test events from 'stripe trigger'.`);
        return;
      }

      const userId = parseInt(session.metadata.userId);
      const planType = session.metadata.planType;
      const amount = session.amount_total / 100;

      /**
       * Calculate subscription period (1 month)
       */
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      /**
       * Create subscription record
       */
      await this.create({
        owner: { id: userId } as any,
        action: 'create',
        body: {
          user_id: userId,
          stripe_subscription_id: session.id,
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

      console.log(`Subscription created for user ${userId} from webhook`);
    } catch (error) {
      console.error('Error handling checkout completed:', error.message);
    }
  }

  /**
   * Handle refunds initiated from Stripe dashboard
   * Automatically cancels subscription when payment is refunded
   * @param charge Stripe charge object
   */
  private async handleChargeRefunded(charge: any) {
    try {
      /**
       * Find the subscription associated with this charge
       */
      const { data: subscription } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_customer_id: charge.customer },
          sort: [['created_at', 'desc']],
        },
      });

      if (!subscription) {
        console.log(`No subscription found for customer ${charge.customer}`);
        return;
      }

      /**
       * Cancel subscription if currently active
       */
      if (subscription.status === SubscriptionStatus.ACTIVE) {
        await this.update({
          owner: { id: subscription.user_id } as any,
          action: 'update',
          id: subscription.id,
          body: {
            status: SubscriptionStatus.CANCELLED,
            cancelled_at: new Date(),
          },
          payload: {},
        });

        console.log(`Subscription ${subscription.id} cancelled due to refund`);
      }
    } catch (error) {
      console.error('Error handling charge refunded:', error.message);
    }
  }

  /**
   * Handle payment disputes (chargebacks)
   * Logs dispute for admin review
   * @param dispute Stripe dispute object
   */
  private async handleDisputeCreated(dispute: any) {
    try {
      console.log(`Payment dispute created: ${dispute.id}`, {
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        reason: dispute.reason,
        status: dispute.status,
      });

      /**
       * Find subscription associated with disputed charge
       */
      const charge = await this.stripeService.getPaymentIntent(dispute.charge);
      if (charge && charge.customer) {
        const { data: subscription } = await this.findOne({
          owner: { id: 0 } as any,
          action: 'findOne',
          payload: {
            where: { stripe_customer_id: charge.customer as string },
            sort: [['created_at', 'desc']],
          },
        });

        // if (subscription) {
        //   console.log(`Dispute affects subscription ${subscription.id} for user ${subscription.user_id}`);
        //   /**
        //    * TODO: Send admin notification email
        //    * TODO: Flag subscription for review
        //    * TODO: Optionally suspend access pending dispute resolution
        //    */
        // }
      }
    } catch (error) {
      console.error('Error handling dispute created:', error.message);
    }
  }

  /**
   * Handle failed payment attempts
   * Logs failure for monitoring
   * @param paymentIntent Stripe payment intent object
   */
  private async handlePaymentFailed(paymentIntent: any) {
    try {
      console.log(`Payment failed: ${paymentIntent.id}`, {
        customerId: paymentIntent.customer,
        amount: paymentIntent.amount / 100,
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
      });

      /**
       * TODO: Send user notification about failed payment
       * TODO: Track failed payment attempts for fraud detection
       */
    } catch (error) {
      console.error('Error handling payment failed:', error.message);
    }
  }
}