import { PartialType, PickType } from '@nestjs/swagger';
import { Chat } from '../entities/chat.entity';

export class UpdateChatDto extends PartialType(
  PickType(Chat, ['user1Id', 'user2Id'] as const),
) {}
