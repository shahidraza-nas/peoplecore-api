import { OmitType } from '@nestjs/swagger';
import { ChatMessage } from '../entities/chat-message.entity';

export class CreateChatMessageDto extends OmitType(ChatMessage, ['active'] as const) {}
