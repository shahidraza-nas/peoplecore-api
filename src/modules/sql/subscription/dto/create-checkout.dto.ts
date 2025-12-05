import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PlanType } from '../entities/subscription.entity';

export class CreateCheckoutDto {
  @ApiProperty({ 
    enum: PlanType,
    description: 'Subscription plan type',
    required: false,
    default: PlanType.CHAT_MONTHLY
  })
  @IsOptional()
  @IsEnum(PlanType)
  plan_type?: PlanType;
}