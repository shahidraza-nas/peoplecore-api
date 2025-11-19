import { OmitType, PartialType } from '@nestjs/swagger';
import { Channel } from '../entities/channel.entity';

export class UpdateChannelDto extends PartialType(
  OmitType(Channel, [] as const),
) {}
