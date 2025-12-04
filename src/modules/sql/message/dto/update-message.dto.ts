import { PartialType, PickType } from '@nestjs/swagger';
import { Message } from '../entities/message.entity';

export class UpdateMessageDto extends PartialType(
  PickType(Message, ['content', 'isRead'] as const),
) {}
