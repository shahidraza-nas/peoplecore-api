import { SqlModule } from '@core/sql';
import { StripeModule } from '@core/stripe';
import { Module } from '@nestjs/common';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [
    SqlModule.register(Subscription),
    StripeModule,
    ConfigModule
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
