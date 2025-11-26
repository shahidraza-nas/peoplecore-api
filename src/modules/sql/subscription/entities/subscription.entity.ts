import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BeforeCreate, BelongsTo, Column, DataType, ForeignKey, Index, Table } from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';
import { uuid } from 'src/core/core.utils';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
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

  @Column
  @ApiProperty({ description: 'User UID for reference' })
  @IsOptional()
  @IsString()
  declare user_uid: string;

  @BelongsTo(() => User)
  user: User;

  @Index('idx_stripe_subscription_id')
  @Column({ unique: true })
  @ApiProperty({ description: 'Stripe Subscription ID' })
  @IsString()
  declare stripe_subscription_id: string;

  @Index('idx_stripe_customer_id')
  @Column
  @ApiProperty({ description: 'Stripe Customer ID' })
  @IsString()
  declare stripe_customer_id: string;

  @Column
  @ApiProperty({ description: 'Stripe Price ID (monthly or yearly plan)' })
  @IsOptional()
  @IsString()
  declare stripe_price_id: string;

  @Column({ allowNull: true })
  @ApiProperty({ description: 'Latest Stripe Invoice ID', required: false })
  @IsOptional()
  @IsString()
  declare stripe_invoice_id: string;

  @Column({ defaultValue: false })
  @ApiProperty({ description: 'User cancelled but subscription remains active until period ends', required: false })
  @IsOptional()
  declare cancel_at_period_end: boolean;

  @Column({ allowNull: true })
  @ApiProperty({ description: 'Next billing date for recurring subscription', required: false })
  @IsOptional()
  declare next_billing_date: Date;

  @Column({ defaultValue: 'active' })
  @ApiProperty({ 
    description: 'Stripe billing status: active, past_due, canceled, trialing, unpaid, incomplete',
    required: false 
  })
  @IsOptional()
  @IsString()
  declare billing_status: string;

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

  @Column({ allowNull: true })
  @ApiProperty({ description: 'Cancellation timestamp', required: false })
  @IsOptional()
  declare cancelled_at: Date;

  @Column({ defaultValue: false })
  @ApiProperty({ description: 'Whether expiry notification was sent', required: false })
  declare expiry_notification_sent: boolean;

  @Column({ unique: 'uid' })
  @ApiProperty({ description: 'Unique ID', readOnly: true, })
  declare uid: string;

  @BeforeCreate
  static setUuid(instance: Subscription) {
    instance.uid = `subs_${uuid()}`;
  }
}