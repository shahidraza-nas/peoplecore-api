import { OmitType, PartialType } from '@nestjs/swagger';
import { Chat } from '../entities/chat.entity';

export class UpdateChatDto extends PartialType(
  OmitType(Chat, [] as const),
) {}
