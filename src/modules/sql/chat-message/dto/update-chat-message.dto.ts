import { PartialType, PickType } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity';

export class UpdateChatMessageDto extends PartialType(
  PickType(ChatMessage, ['message', 'isRead'] as const),
) {}
