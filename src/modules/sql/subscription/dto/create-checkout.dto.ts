import { PickType } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

export class CreateCheckoutDto extends PickType(Subscription, ['plan_type'] as const) { }