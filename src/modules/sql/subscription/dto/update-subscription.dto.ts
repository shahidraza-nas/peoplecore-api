import { PartialType, PickType } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

/**
 * DTO for updating subscriptions
 * Note: Most subscription updates happen automatically via Stripe webhooks
 * This DTO is for manual subscription updates (admin use)
 */
export class UpdateSubscriptionDto extends PartialType(
  PickType(Subscription, [
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
    'cancelled_at',
    'next_billing_date',
    'expiry_notification_sent',
  ] as const),
) { }
