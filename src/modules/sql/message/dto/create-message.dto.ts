import { PickType } from '@nestjs/swagger';
import { Message } from '../entities/message.entity';

export class CreateMessageDto extends PickType(Message, [
  'channelId',
  'userId',
  'content',
  'isRead',
] as const) {}
