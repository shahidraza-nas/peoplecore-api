import { PickType } from '@nestjs/swagger';
import { Channel } from '../entities/channel.entity';

export class CreateChannelDto extends PickType(Channel, [
  'name',
  'type',
  'description',
] as const) {}
