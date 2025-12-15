import { Module } from '@nestjs/common';
import { MsClientModule } from 'src/core/modules/ms-client/ms-client.module';
import { RedisPropagatorModule } from 'src/core/modules/socket/redis-propagator/redis-propagator.module';
import { SocketEventService } from './socket-event.service';
import { SocketEventController } from './socket-event.controller';
import { ChatModule } from '../sql/chat/chat.module';

@Module({
  imports: [MsClientModule, RedisPropagatorModule, ChatModule],
  providers: [SocketEventService],
  controllers: [SocketEventController],
  exports: [SocketEventService],
})
export class SocketEventModule {}
