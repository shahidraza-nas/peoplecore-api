import { OmitType } from '@nestjs/swagger';
import { Message } from '../entities/message.entity';

export class CreateMessageDto extends OmitType(Message, ['active'] as const) {}
