import { PickType } from '@nestjs/swagger';
import { ChannelMember } from '../entities/channel-member.entity';

export class CreateChannelMemberDto extends PickType(ChannelMember, [
  'channelId',
  'userId',
  'joinedAt',
] as const) {}
