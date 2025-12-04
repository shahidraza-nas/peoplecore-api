import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Injectable } from '@nestjs/common';
import { StripeService } from '@core/stripe';
import { ConfigService } from '@nestjs/config';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { Job } from 'src/core/core.job';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { APPEVENTS } from 'src/constants';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@Injectable()
export class SubscriptionService extends ModelService<Subscription> {
  searchFields: SearchFields<Subscription> = ['stripe_subscription_id', 'stripe_customer_id'];

  constructor(
    db: SqlService<Subscription>,
    private stripeService: StripeService,
    private configService: ConfigService,
    private msClient: MsClientService,
  ) {
    super(db);
  }

  /**
   * Helper: Extract period dates from Stripe subscription
   * Handles both old and new API versions where period dates may be in different locations
   * @param subscription Stripe subscription object
   * @returns Object with periodStart and periodEnd timestamps
   */
  private extractPeriodDates(subscription: any): { periodStart: number; periodEnd: number } | null {
    const isValidTimestamp = (timestamp: any): boolean => {
      return timestamp && typeof timestamp === 'number' && timestamp > 0;
    };

    /**
     * Try subscription-level fields first (older API versions)
     */
    let periodStart = subscription.current_period_start;
    let periodEnd = subscription.current_period_end;

    if (isValidTimestamp(periodStart) && isValidTimestamp(periodEnd)) {
      return { periodStart, periodEnd };
    }

    /**
     * Calculate from billing cycle and interval (newer API versions)
     */
    const billingCycleAnchor = subscription.billing_cycle_anchor || subscription.created;
    const interval = subscription.items?.data?.[0]?.price?.recurring?.interval || 'month';
    const intervalCount = subscription.items?.data?.[0]?.price?.recurring?.interval_count || 1;

    if (!isValidTimestamp(billingCycleAnchor)) {
      return null;
    }

    periodStart = billingCycleAnchor;

    /**
     * Calculate period end based on interval
     */
    const startDate = new Date(billingCycleAnchor * 1000);
    if (interval === 'month') {
      startDate.setMonth(startDate.getMonth() + intervalCount);
    } else if (interval === 'year') {
      startDate.setFullYear(startDate.getFullYear() + intervalCount);
    } else if (interval === 'week') {
      startDate.setDate(startDate.getDate() + (7 * intervalCount));
    } else if (interval === 'day') {
      startDate.setDate(startDate.getDate() + intervalCount);
    }

    periodEnd = Math.floor(startDate.getTime() / 1000);

    return { periodStart, periodEnd };
  }

  /**
   * Send subscription created email notification
   */
  private async sendSubscriptionCreatedEmail(userId: number, userName: string, subscription: any) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const companyName = this.configService.get('COMPANY_NAME') || 'PeopleCore';

      await this.msClient.executeJob(
        APPEVENTS.NOTIFICATION,
        new Job({
          action: 'send',
          payload: {
            user_id: userId,
            template: 'subscription_created',
            variables: {
              TO_NAME: userName,
              COMPANY_NAME: companyName,
              PLAN_TYPE: this.formatPlanType(subscription.plan_type),
              AMOUNT: subscription.amount,
              CURRENCY: subscription.currency?.toUpperCase() || 'USD',
              NEXT_BILLING_DATE: new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              CHAT_URL: `${frontendUrl}/chat`,
            },
          },
        }),
      );
    } catch (error) {
      console.error('Failed to send subscription created email:', error);
    }
  }

  /**
   * Send subscription expiring email notification
   */
  private async sendSubscriptionExpiringEmail(userId: number, userName: string, subscription: any, daysRemaining: number) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const companyName = this.configService.get('COMPANY_NAME') || 'PeopleCore';

      await this.msClient.executeJob(
        APPEVENTS.NOTIFICATION,
        new Job({
          action: 'send',
          payload: {
            user_id: userId,
            template: 'subscription_expiring',
            variables: {
              TO_NAME: userName,
              COMPANY_NAME: companyName,
              DAYS_REMAINING: daysRemaining.toString(),
              PLAN_TYPE: this.formatPlanType(subscription.plan_type),
              EXPIRY_DATE: new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              RENEW_URL: `${frontendUrl}/subscription`,
            },
          },
        }),
      );
    } catch (error) {
      console.error('Failed to send subscription expiring email:', error);
    }
  }

  /**
   * Send subscription cancelled email notification
   */
  private async sendSubscriptionCancelledEmail(userId: number, userName: string, subscription: any) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const companyName = this.configService.get('COMPANY_NAME') || 'PeopleCore';

      await this.msClient.executeJob(
        APPEVENTS.NOTIFICATION,
        new Job({
          action: 'send',
          payload: {
            user_id: userId,
            template: 'subscription_cancelled',
            variables: {
              TO_NAME: userName,
              COMPANY_NAME: companyName,
              PLAN_TYPE: this.formatPlanType(subscription.plan_type),
              PERIOD_END: new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
              REACTIVATE_URL: `${frontendUrl}/subscription`,
            },
          },
        }),
      );
    } catch (error) {
      console.error('Failed to send subscription cancelled email:', error);
    }
  }

  /**
   * Send payment failed email notification
   */
  private async sendPaymentFailedEmail(userId: number, userName: string, subscription: any, attemptCount: number) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const companyName = this.configService.get('COMPANY_NAME') || 'PeopleCore';

      await this.msClient.executeJob(
        APPEVENTS.NOTIFICATION,
        new Job({
          action: 'send',
          payload: {
            user_id: userId,
            template: 'subscription_payment_failed',
            variables: {
              TO_NAME: userName,
              COMPANY_NAME: companyName,
              AMOUNT: subscription.amount,
              CURRENCY: subscription.currency?.toUpperCase() || 'USD',
              ATTEMPT_COUNT: attemptCount.toString(),
              UPDATE_PAYMENT_URL: `${frontendUrl}/subscription`,
            },
          },
        }),
      );
    } catch (error) {
      console.error('Failed to send payment failed email:', error);
    }
  }

  /**
   * Send subscription renewed email notification
   */
  private async sendSubscriptionRenewedEmail(userId: number, userName: string, subscription: any, amountPaid: number) {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL');
      const companyName = this.configService.get('COMPANY_NAME') || 'PeopleCore';

      await this.msClient.executeJob(
        APPEVENTS.NOTIFICATION,
        new Job({
          action: 'send',
          payload: {
            user_id: userId,
            template: 'subscription_renewed',
            variables: {
              TO_NAME: userName,
              COMPANY_NAME: companyName,
              PLAN_TYPE: this.formatPlanType(subscription.plan_type),
              AMOUNT: amountPaid.toString(),
              CURRENCY: subscription.currency?.toUpperCase() || 'USD',
              NEXT_BILLING_DATE: new Date(subscription.current_period_end).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            },
          },
        }),
      );
    } catch (error) {
      console.error('Failed to send subscription renewed email:', error);
    }
  }

  /**
   * Format plan type for display
   */
  private formatPlanType(planType: string): string {
    const planMap = {
      chat_monthly: 'Chat (Monthly)',
      chat_yearly: 'Chat (Yearly)',
    };
    return planMap[planType] || planType;
  }

  /**
   * Create Stripe checkout session for recurring subscription
   * Uses Stripe's native subscription with automatic renewals
   */
  async createCheckoutSession(
    owner: OwnerDto,
    createCheckoutDto: CreateCheckoutDto,
  ) {
    const userId = owner.id;
    const userEmail = owner.email;
    const planType = createCheckoutDto.plan_type || 'chat_monthly';
    const frontendUrl = this.configService.get('FRONTEND_URL');
    const stripeConfig = this.configService.get('stripe');

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

      /**
       * Map plan type to Stripe Price ID
       */
      const priceIds = {
        chat_monthly: stripeConfig.priceMonthly,
        chat_yearly: stripeConfig.priceYearly,
      };

      const priceId = priceIds[planType];
      if (!priceId) {
        return {
          error: new Error(`Invalid plan type: ${planType}`),
          data: null,
        };
      }

      /**
       * Create Stripe Checkout Session with subscription mode
       */
      const session = await this.stripeService.stripe.checkout.sessions.create({
        mode: 'subscription', // Recurring subscription
        payment_method_types: ['card'],
        customer: customerId,
        line_items: [{
          price: priceId, // Stripe Price ID
          quantity: 1,
        }],
        success_url: `${frontendUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/subscription/checkout?cancelled=true`,
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            userUid: owner.uid,
            userEmail: userEmail,
            userName: owner.name || `${owner.first_name} ${owner.last_name}`,
            planType,
          },
        },
        metadata: {
          userId: userId.toString(),
          userUid: owner.uid,
          planType,
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
   * Check if user has active chat access
   * Stripe webhooks keep subscription status in sync
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
     * Check billing_status (source of truth from Stripe)
     * Allow access for 'active' and 'trialing' statuses
     */
    const activeBillingStatuses = ['active', 'trialing'];
    if (!activeBillingStatuses.includes(subscription.billing_status)) {
      return false;
    }

    /**
     * If subscription is cancelled but period hasn't ended, allow access
     * User retains access until current_period_end
     */
    if (subscription.cancel_at_period_end) {
      return new Date() < new Date(subscription.current_period_end);
    }

    /**
     * Check internal status and period validity
     * Allow access for both active and trialing subscriptions
     */
    const validStatuses = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];
    return validStatuses.includes(subscription.status) &&
      new Date() < new Date(subscription.current_period_end);
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
   * Cancel user subscription in Stripe
   * @param owner - User making the request
   * @param cancelImmediately - If true, cancels immediately. If false, cancels at period end (default)
   * User retains access until the end of current billing period when cancelImmediately is false
   */
  async cancelUserSubscription(owner: OwnerDto, cancelImmediately: boolean = false) {
    const subscription = await this.getUserSubscription(owner);

    if (!subscription) {
      return { error: new Error('No subscription found') };
    }

    if (!subscription.stripe_subscription_id) {
      return {
        error: new Error('Invalid subscription - missing Stripe subscription ID')
      };
    }

    try {
      if (cancelImmediately) {
        /**
         * Cancel subscription immediately in Stripe
         * This triggers customer.subscription.deleted webhook
         * Same as clicking "Cancel Immediately" in Stripe Dashboard
         */
        await this.stripeService.stripe.subscriptions.cancel(
          subscription.stripe_subscription_id,
          {
            prorate: false, // No prorated refund (matches "No refund" option)
          }
        );

        console.log(`Subscription ${subscription.stripe_subscription_id} canceled immediately via API`);

        /**
         * Webhook (customer.subscription.deleted) will update the database
         * Return current subscription data for immediate UI response
         */
        return { error: null, data: subscription };
      } else {
        /**
         * Cancel subscription at period end in Stripe
         * User retains access until current_period_end
         */
        await this.stripeService.stripe.subscriptions.update(
          subscription.stripe_subscription_id,
          { cancel_at_period_end: true }
        );

        /**
         * Update database (webhook will also sync this)
         */
        return this.update({
          owner,
          action: 'update',
          id: subscription.id,
          body: {
            cancel_at_period_end: true,
            cancelled_at: new Date(),
          },
          payload: {},
        });
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error.message);
      return { error: new Error('Failed to cancel subscription. Please try again.') };
    }
  }

  /**
   * Reactivate a cancelled subscription
   * Removes cancel_at_period_end flag from Stripe subscription
   */
  async reactivateUserSubscription(owner: OwnerDto) {
    const subscription = await this.getUserSubscription(owner);

    if (!subscription) {
      return { error: new Error('No subscription found') };
    }

    if (!subscription.cancel_at_period_end) {
      return { error: new Error('Subscription is not scheduled for cancellation') };
    }

    if (!subscription.stripe_subscription_id) {
      return {
        error: new Error('Invalid subscription - missing Stripe subscription ID')
      };
    }

    try {
      /**
       * Remove cancellation flag in Stripe
       */
      await this.stripeService.stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        { cancel_at_period_end: false }
      );

      console.log(`Subscription ${subscription.stripe_subscription_id} reactivated`);

      /**
       * Update database
       */
      return this.update({
        owner,
        action: 'update',
        id: subscription.id,
        body: {
          cancel_at_period_end: false,
          cancelled_at: null,
        },
        payload: {},
      });
    } catch (error) {
      console.error('Failed to reactivate subscription:', error.message);
      return { error: new Error('Failed to reactivate subscription. Please try again.') };
    }
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

      /**
       * Calculate total revenue from active subscriptions
       */
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
   * Update subscription by uid
   * @param owner - Owner/authenticated user
   * @param uid - Subscription uid to update
   * @param body - Update data
   * @returns JobResponse with updated subscription data or error
   */
  async updateSubscriptionByUid(owner: OwnerDto, uid: string, body: any) {
    return await this.update({
      owner,
      uid,
      body,
    });
  }

  /**
   * Find one subscription with explicit query parameters
   * @param owner - Owner/authenticated user
   * @param query - Query parameters (where, select, populate, sort, search, offset)
   * @returns JobResponse with subscription data or error
   */
  async findOneSubscription(owner: OwnerDto, query: any) {
    const { where } = query;
    return await this.findOne({
      owner,
      payload: { where },
    });
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
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
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

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
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
      /**
       * TODO: Send user notification about failed payment
       */
    } catch (error) {
      console.error('Error handling payment failed:', error.message);
    }
  }

  /**
   * Handle checkout.session.completed event
   * This is the most reliable event for creating subscriptions
   * Fires after payment is complete and subscription is fully set up
   * @param session Stripe checkout session object
   */
  private async handleCheckoutCompleted(session: any) {
    try {
      /**
       * Only handle subscription mode (not payment mode)
       */
      if (session.mode !== 'subscription') {
        console.log(`Session ${session.id} is not subscription mode, skipping`);
        return;
      }

      /**
       * Fetch complete subscription from Stripe
       * Session.subscription is just the ID, need to fetch full object
       */
      if (!session.subscription) {
        console.error(`Session ${session.id} has no subscription`);
        return;
      }

      const subscription = await this.stripeService.getSubscription(session.subscription as string) as any;

      if (!subscription) {
        console.error(`Failed to fetch subscription ${session.subscription} from Stripe`);
        return;
      }

      /**
       * Call the subscription created handler with complete data
       */
      await this.handleSubscriptionCreated(subscription);
    } catch (error) {
      console.error('Error handling checkout completed:', error.message);
    }
  }

  /**
   * Handle customer.subscription.created event
   * Creates subscription record when Stripe subscription is created
   * @param subscription Stripe subscription object
   */
  private async handleSubscriptionCreated(subscriptionData: any) {
    try {
      console.log(`Processing customer.subscription.created: ${subscriptionData.id}`);

      /**
       * Check if subscription already exists (idempotency)
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: subscriptionData.id },
        },
      });

      if (existing) {
        console.log(`Subscription ${subscriptionData.id} already exists with DB ID ${existing.id}`);
        return;
      }

      /**
       * Extract metadata for linking to user
       */
      console.log(`Subscription metadata:`, subscriptionData.metadata);

      if (!subscriptionData.metadata || !subscriptionData.metadata.userId || !subscriptionData.metadata.planType) {
        console.error(`Subscription ${subscriptionData.id} missing required metadata. Got:`, subscriptionData.metadata);
        return;
      }

      const userId = parseInt(subscriptionData.metadata.userId);
      const userUid = subscriptionData.metadata.userUid;
      const planType = subscriptionData.metadata.planType;

      /**
       * Use the subscription data directly (already fetched by caller)
       * No need to fetch again
       */
      const subscription = subscriptionData;

      /**
       * Map Stripe status to our status enum
       */
      let status: SubscriptionStatus;
      switch (subscription.status) {
        case 'active':
          status = SubscriptionStatus.ACTIVE;
          break;
        case 'trialing':
          status = SubscriptionStatus.TRIALING;
          break;
        case 'past_due':
        case 'unpaid':
          status = SubscriptionStatus.EXPIRED;
          break;
        case 'canceled':
        case 'incomplete_expired':
          status = SubscriptionStatus.CANCELLED;
          break;
        default:
          status = SubscriptionStatus.INACTIVE;
      }

      /**
       * Get subscription price/amount
       */
      const amount = subscription.items.data[0]?.price?.unit_amount / 100 || 0;

      /**
       * Extract period dates using helper function
       */
      const periods = this.extractPeriodDates(subscription);

      if (!periods) {
        console.error(`Failed to extract period dates for subscription ${subscription.id}`);
        return;
      }

      const periodStart = new Date(periods.periodStart * 1000);
      const periodEnd = new Date(periods.periodEnd * 1000);
      const nextBillingDate = subscription.cancel_at_period_end
        ? null
        : new Date(periods.periodEnd * 1000);

      /**
       * Extract customer ID (handle both string and expanded object)
       * Beta Stripe API may return expanded customer object
       */
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id;

      if (!customerId) {
        console.error(`Subscription ${subscription.id} has no valid customer ID`);
        return;
      }

      /**
       * Create subscription record in database
       */
      const result = await this.create({
        owner: { id: userId } as any,
        action: 'create',
        body: {
          user_id: userId,
          user_uid: userUid,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          stripe_price_id: subscription.items.data[0]?.price?.id,
          status,
          plan_type: planType,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          amount,
          currency: subscription.currency || 'usd',
          billing_status: subscription.status,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          next_billing_date: nextBillingDate,
        },
        payload: {},
      });

      if (result.error) {
        console.error(`[CRITICAL] Failed to create subscription for user ${userId}:`, result.error);
        console.error('Full result:', JSON.stringify(result, null, 2));
        throw new Error(`Failed to create subscription: ${result.error.message}`);
      }

      console.log(`Subscription created for user ${userId} via customer.subscription.created webhook. DB ID: ${result.data?.id}`);

      /**
       * Send subscription created email
       */
      const userName = subscriptionData.metadata.userName || 'Valued User';
      await this.sendSubscriptionCreatedEmail(userId, userName, result.data);
    } catch (error) {
      console.error('Error handling subscription created:', error.message);
    }
  }

  /**
   * Handle customer.subscription.updated event
   * Updates subscription record when Stripe subscription changes
   * This includes renewals, cancellations, plan changes, etc.
   * @param subscription Stripe subscription object
   */
  private async handleSubscriptionUpdated(subscription: any) {
    try {
      console.log(`Processing customer.subscription.updated: ${subscription.id}`);

      /**
       * Find existing subscription record
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: subscription.id },
        },
      });

      if (!existing) {
        console.log(`Subscription ${subscription.id} not found in database. Creating new record.`);
        /**
         * If subscription doesn't exist, create it (handles edge case)
         */
        await this.handleSubscriptionCreated(subscription);
        return;
      }

      /**
       * Map Stripe status to our status enum
       */
      let status: SubscriptionStatus;
      switch (subscription.status) {
        case 'active':
          status = SubscriptionStatus.ACTIVE;
          break;
        case 'trialing':
          status = SubscriptionStatus.TRIALING;
          break;
        case 'past_due':
        case 'unpaid':
          status = SubscriptionStatus.EXPIRED;
          break;
        case 'canceled':
        case 'incomplete_expired':
          status = SubscriptionStatus.CANCELLED;
          break;
        default:
          status = SubscriptionStatus.INACTIVE;
      }

      /**
       * Get updated amount (in case plan changed)
       */
      const amount = subscription.items.data[0]?.price?.unit_amount / 100 || existing.amount;

      /**
       * Extract period dates using helper function
       */
      const periods = this.extractPeriodDates(subscription);

      if (!periods) {
        console.error(`Failed to extract period dates for subscription ${subscription.id}`);
        return;
      }

      const periodStart = new Date(periods.periodStart * 1000);
      const periodEnd = new Date(periods.periodEnd * 1000);
      const nextBillingDate = subscription.cancel_at_period_end
        ? null
        : new Date(periods.periodEnd * 1000);
      const cancelledAt = (subscription.canceled_at && typeof subscription.canceled_at === 'number')
        ? new Date(subscription.canceled_at * 1000)
        : null;

      /**
       * Update subscription record
       */
      await this.update({
        owner: { id: existing.user_id } as any,
        action: 'update',
        id: existing.id,
        body: {
          status,
          billing_status: subscription.status,
          current_period_start: periodStart,
          current_period_end: periodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
          next_billing_date: nextBillingDate,
          amount,
          stripe_price_id: subscription.items.data[0]?.price?.id || existing.stripe_price_id,
          cancelled_at: cancelledAt,
        },
        payload: {},
      });

      console.log(`Subscription ${subscription.id} updated for user ${existing.user_id}. Status: ${status}, billing_status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);

      /**
       * Check if subscription is expiring soon (3 days before) and send notification
       * Only send if notification hasn't been sent yet
       */
      if (!existing.expiry_notification_sent && status === SubscriptionStatus.ACTIVE) {
        const now = new Date();
        const daysUntilExpiry = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
          const userName = subscription.metadata?.userName || 'Valued User';
          await this.sendSubscriptionExpiringEmail(existing.user_id, userName, existing, daysUntilExpiry);

          /**
           * Mark notification as sent
           */
          await this.update({
            owner: { id: existing.user_id } as any,
            action: 'update',
            id: existing.id,
            body: { expiry_notification_sent: true },
            payload: {},
          });
        }
      }

      /**
       * Send cancellation email if subscription was just cancelled
       */
      if (subscription.cancel_at_period_end && !existing.cancel_at_period_end) {
        const userName = subscription.metadata?.userName || 'Valued User';
        await this.sendSubscriptionCancelledEmail(existing.user_id, userName, existing);
      }
    } catch (error) {
      console.error('Error handling subscription updated:', error.message);
    }
  }

  /**
   * Handle customer.subscription.deleted event
   * Marks subscription as cancelled when Stripe subscription is deleted
   * @param subscription Stripe subscription object
   */
  private async handleSubscriptionDeleted(subscription: any) {
    try {
      console.log(`Processing customer.subscription.deleted: ${subscription.id}`);

      /**
       * Find existing subscription record
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: subscription.id },
        },
      });

      if (!existing) {
        console.log(`Subscription ${subscription.id} not found in database`);
        return;
      }

      /**
       * Mark subscription as cancelled
       */
      await this.update({
        owner: { id: existing.user_id } as any,
        action: 'update',
        id: existing.id,
        body: {
          status: SubscriptionStatus.CANCELLED,
          billing_status: 'canceled',
          cancelled_at: new Date(),
          cancel_at_period_end: false,
          next_billing_date: null,
        },
        payload: {},
      });

      console.log(`Subscription ${subscription.id} deleted for user ${existing.user_id}`);
    } catch (error) {
      console.error('Error handling subscription deleted:', error.message);
    }
  }

  /**
   * Handle invoice.paid event
   * Updates subscription when recurring payment succeeds
   * This is the primary event for handling successful renewals
   * @param invoice Stripe invoice object
   */
  private async handleInvoicePaid(invoice: any) {
    try {
      console.log(`Processing invoice.paid: ${invoice.id}`);

      /**
       * Skip if no subscription associated (one-time invoices)
       */
      if (!invoice.subscription) {
        console.log(`Invoice ${invoice.id} has no subscription. Skipping.`);
        return;
      }

      /**
       * Find subscription by stripe_subscription_id
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: invoice.subscription },
        },
      });

      /**
       * If subscription doesn't exist, create it now
       * This handles the case where subscription.created had invalid timestamps
       */
      if (!existing) {
        console.log(`Subscription ${invoice.subscription} not found for invoice ${invoice.id}, creating now from invoice.paid event...`);

        /**
         * Fetch subscription to get metadata and create record
         */
        const subscription = await this.stripeService.getSubscription(invoice.subscription) as any;

        if (!subscription || !subscription.metadata) {
          console.error(`Failed to fetch subscription ${invoice.subscription} or missing metadata`);
          return;
        }

        /**
         * Create subscription using the complete data from invoice.paid
         * At this point, Stripe has all the data properly set
         */
        await this.handleSubscriptionCreated(subscription);
        return;
      }

      /**
       * Fetch full subscription details from Stripe to get updated period
       */
      const subscription = await this.stripeService.getSubscription(invoice.subscription) as any;

      if (!subscription) {
        console.log(`Failed to fetch subscription ${invoice.subscription} from Stripe`);
        return;
      }

      /**
       * Validate and convert timestamps
       */
      const isValidTimestamp = (timestamp: any): boolean => {
        return timestamp && typeof timestamp === 'number' && timestamp > 0;
      };

      if (!isValidTimestamp(subscription.current_period_start) || !isValidTimestamp(subscription.current_period_end)) {
        console.error(`Invalid timestamps in subscription ${subscription.id}:`, {
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
        });
        return;
      }

      /**
       * Extract period dates using helper function
       */
      const periods = this.extractPeriodDates(subscription);

      if (!periods) {
        console.error(`Failed to extract period dates for subscription ${subscription.id}`);
        return;
      }

      const periodStart = new Date(periods.periodStart * 1000);
      const periodEnd = new Date(periods.periodEnd * 1000);
      const nextBillingDate = subscription.cancel_at_period_end
        ? null
        : new Date(periods.periodEnd * 1000);

      /**
       * Update subscription with new period and billing info
       */
      await this.update({
        owner: { id: existing.user_id } as any,
        action: 'update',
        id: existing.id,
        body: {
          status: SubscriptionStatus.ACTIVE,
          billing_status: 'active',
          current_period_start: periodStart,
          current_period_end: periodEnd,
          next_billing_date: nextBillingDate,
          stripe_invoice_id: invoice.id,
          amount: invoice.amount_paid / 100,
        },
        payload: {},
      });

      console.log(`Subscription ${invoice.subscription} renewed for user ${existing.user_id} via invoice.paid`);

      /**
       * Send subscription renewed email notification
       * Only send if this is a renewal (not first payment)
       */
      if (invoice.billing_reason === 'subscription_cycle') {
        const userName = subscription.metadata?.userName || 'Valued User';
        const amountPaid = invoice.amount_paid / 100;
        await this.sendSubscriptionRenewedEmail(existing.user_id, userName, existing, amountPaid);
      }
    } catch (error) {
      console.error('Error handling invoice paid:', error.message);
    }
  }

  /**
   * Handle invoice.payment_failed event
   * Updates subscription status when recurring payment fails
   * Stripe will retry payment automatically based on retry settings
   * @param invoice Stripe invoice object
   */
  private async handleInvoicePaymentFailed(invoice: any) {
    try {
      console.log(`Processing invoice.payment_failed: ${invoice.id}`);

      /**
       * Skip if no subscription associated
       */
      if (!invoice.subscription) {
        console.log(`Invoice ${invoice.id} has no subscription. Skipping.`);
        return;
      }

      /**
       * Find subscription by stripe_subscription_id
       */
      const { data: existing } = await this.findOne({
        owner: { id: 0 } as any,
        action: 'findOne',
        payload: {
          where: { stripe_subscription_id: invoice.subscription },
        },
      });

      if (!existing) {
        console.log(`Subscription ${invoice.subscription} not found for failed invoice ${invoice.id}`);
        return;
      }

      /**
       * Fetch subscription to get current status
       */
      const subscription = await this.stripeService.getSubscription(invoice.subscription) as any;

      if (!subscription) {
        console.log(`Failed to fetch subscription ${invoice.subscription} from Stripe`);
        return;
      }

      /**
       * Update subscription status to reflect payment failure
       */
      await this.update({
        owner: { id: existing.user_id } as any,
        action: 'update',
        id: existing.id,
        body: {
          status: subscription.status === 'past_due' ? SubscriptionStatus.EXPIRED : existing.status,
          billing_status: subscription.status,
          stripe_invoice_id: invoice.id,
        },
        payload: {},
      });

      console.log(`Subscription ${invoice.subscription} payment failed for user ${existing.user_id}`, {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      });

      /**
       * Send payment failed email notification
       */
      const userName = subscription.metadata?.userName || 'Valued User';
      await this.sendPaymentFailedEmail(existing.user_id, userName, existing, invoice.attempt_count || 1);
    } catch (error) {
      console.error('Error handling invoice payment failed:', error.message);
    }
  }
}