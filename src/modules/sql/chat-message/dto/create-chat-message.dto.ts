import { PickType } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity';

export class CreateChatMessageDto extends PickType(ChatMessage, [
  'message',
  'isRead',
  'fromUserId',
  'toUserId',
  'chatId',
] as const) {}
