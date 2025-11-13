import { OmitType, PartialType } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity';

export class UpdateChatMessageDto extends PartialType(
  OmitType(ChatMessage, [] as const),
) {}
