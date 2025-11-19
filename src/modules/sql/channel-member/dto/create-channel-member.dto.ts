import { OmitType } from '@nestjs/swagger';
import { ChannelMember } from '../entities/channel-member.entity';

export class CreateChannelMemberDto extends OmitType(ChannelMember, ['active'] as const) {}
