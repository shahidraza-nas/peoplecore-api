import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import twilioConfig from './twilio.config';
import { TwilioController } from './twilio.controller';
import { TwilioService } from './twilio.service';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [twilioConfig],
    }),
    MsClientModule,
  ],
  controllers: [TwilioController],
  providers: [TwilioService],
  exports: [TwilioService],
})
export class TwilioModule {}
