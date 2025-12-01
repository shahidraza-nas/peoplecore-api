import { OmitType, PartialType } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

export class UpdateSubscriptionDto extends PartialType(
  OmitType(Subscription, [] as const),
) {}
