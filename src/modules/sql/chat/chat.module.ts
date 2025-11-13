import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { Chat } from './entities/chat.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [SqlModule.register(Chat)],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
