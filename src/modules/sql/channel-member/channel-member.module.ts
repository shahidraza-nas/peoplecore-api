import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { ChannelMember } from './entities/channel-member.entity';
import { ChannelMemberController } from './channel-member.controller';
import { ChannelMemberService } from './channel-member.service';

@Module({
  imports: [SqlModule.register(ChannelMember)],
  controllers: [ChannelMemberController],
  providers: [ChannelMemberService],
})
export class ChannelMemberModule {}
