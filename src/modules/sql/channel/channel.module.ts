import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { Channel } from './entities/channel.entity';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';

@Module({
  imports: [SqlModule.register(Channel)],
  controllers: [ChannelController],
  providers: [ChannelService],
})
export class ChannelModule {}
