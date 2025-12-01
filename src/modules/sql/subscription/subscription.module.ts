import { SqlModule } from '@core/sql';
import { StripeModule } from '@core/stripe';
import { Module } from '@nestjs/common';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionExpiryCron } from './crons/subscription-expiry.cron';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    SqlModule.register(Subscription),
    StripeModule,
    ConfigModule,
    MsClientModule,
    UserModule,
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionExpiryCron],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
