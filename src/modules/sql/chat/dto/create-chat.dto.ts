import { OmitType } from '@nestjs/swagger';
import { Chat } from '../entities/chat.entity';

export class CreateChatDto extends OmitType(Chat, ['active'] as const) {}
