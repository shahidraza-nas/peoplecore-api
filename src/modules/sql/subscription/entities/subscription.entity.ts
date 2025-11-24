import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BelongsTo, Column, DataType, ForeignKey, Table } from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PlanType {
  CHAT_MONTHLY = 'chat_monthly',
  CHAT_YEARLY = 'chat_yearly',
}

@Table
export class Subscription extends SqlModel {
  @ForeignKey(() => User)
  @Column
  @ApiProperty({ description: 'User ID' })
  declare user_id: number;

  @BelongsTo(() => User)
  user: User;

  @Column({ unique: true })
  @ApiProperty({ description: 'Stripe Subscription ID' })
  @IsString()
  declare stripe_subscription_id: string;

  @Column
  @ApiProperty({ description: 'Stripe Customer ID' })
  @IsString()
  declare stripe_customer_id: string;

  @Column({
    type: DataType.ENUM(...Object.values(SubscriptionStatus)),
    defaultValue: SubscriptionStatus.INACTIVE,
  })
  @ApiProperty({ enum: SubscriptionStatus })
  @IsEnum(SubscriptionStatus)
  declare status: SubscriptionStatus;

  @Column({
    type: DataType.ENUM(...Object.values(PlanType)),
    defaultValue: PlanType.CHAT_MONTHLY,
  })
  @ApiProperty({ enum: PlanType })
  @IsEnum(PlanType)
  declare plan_type: PlanType;

  @Column
  @ApiProperty({ description: 'Subscription period start' })
  declare current_period_start: Date;

  @Column
  @ApiProperty({ description: 'Subscription period end' })
  declare current_period_end: Date;

  @Column(DataType.DECIMAL(10, 2))
  @ApiProperty({ description: 'Subscription amount' })
  declare amount: number;

  @Column({ defaultValue: 'usd' })
  @ApiProperty({ description: 'Currency' })
  @IsOptional()
  declare currency: string;

  @Column({ unique: 'uid' })
  @ApiProperty({ description: 'Unique ID' })
  declare uid: string;
}