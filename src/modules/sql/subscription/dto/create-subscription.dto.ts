import { PickType } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

/**
 * DTO for creating subscriptions
 * Note: Subscriptions are typically created automatically via Stripe webhooks
 * This DTO is for manual subscription creation (admin use)
 */
export class CreateSubscriptionDto extends PickType(Subscription, [
  'user_id',
  'user_uid',
  'stripe_subscription_id',
  'stripe_customer_id',
  'stripe_price_id',
  'stripe_invoice_id',
  'status',
  'plan_type',
  'current_period_start',
  'current_period_end',
  'amount',
  'currency',
  'billing_status',
  'cancel_at_period_end',
  'next_billing_date',
] as const) {}
