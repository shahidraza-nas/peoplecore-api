import { OmitType, PartialType } from '@nestjs/swagger';
import { ChannelMember } from '../entities/channel-member.entity';

export class UpdateChannelMemberDto extends PartialType(
  OmitType(ChannelMember, [] as const),
) {}
