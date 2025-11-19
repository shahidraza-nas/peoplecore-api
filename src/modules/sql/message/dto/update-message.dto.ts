import { OmitType, PartialType } from '@nestjs/swagger';
import { Message } from '../entities/message.entity';

export class UpdateMessageDto extends PartialType(
  OmitType(Message, [] as const),
) {}
