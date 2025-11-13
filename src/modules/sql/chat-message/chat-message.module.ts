import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatMessageController } from './chat-message.controller';
import { ChatMessageService } from './chat-message.service';

@Module({
  imports: [SqlModule.register(ChatMessage)],
  controllers: [ChatMessageController],
  providers: [ChatMessageService],
})
export class ChatMessageModule {}
