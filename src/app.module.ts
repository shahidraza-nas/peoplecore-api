import { EmailModule } from '@core/email';
import { MongoModule } from '@core/mongo';
import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { CoreModule } from './core/core.module';
import { CommonModule } from './modules/common.module';
import { FirebaseModule } from '@core/firebase';
import { GeocoderModule } from '@core/geocoder';
import { TwilioModule } from '@core/twilio';
import { SocketEventModule } from './modules/socket-event/socket-event.module';

@Module({
  imports: [
    CoreModule,
    MongoModule.root({ seeder: true }),
    SqlModule.root({ seeder: true }),
    EmailModule,
    CommonModule.register(),
    FirebaseModule,
    GeocoderModule,
    TwilioModule,
    SocketEventModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppGateway],
})
export class AppModule {}
