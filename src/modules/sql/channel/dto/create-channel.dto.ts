import { OmitType } from '@nestjs/swagger';
import { Channel } from '../entities/channel.entity';

export class CreateChannelDto extends OmitType(Channel, ['active'] as const) {}
