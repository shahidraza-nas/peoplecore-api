import { SqlModule } from '@core/sql';
import { Module } from '@nestjs/common';
import { Newsfeed } from './entities/newsfeed.entity';
import { NewsfeedController } from './newsfeed.controller';
import { NewsfeedService } from './newsfeed.service';

@Module({
  imports: [SqlModule.register(Newsfeed)],
  controllers: [NewsfeedController],
  providers: [NewsfeedService],
})
export class NewsfeedModule {}
