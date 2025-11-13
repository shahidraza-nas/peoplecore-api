import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { redisProviders } from './redis.providers';
import { RedisService } from './redis.service';
import redisConfig from '../../../config/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [redisConfig],
    }),
  ],
  providers: [...redisProviders, RedisService],
  exports: [...redisProviders, RedisService],
})
export class RedisModule {}
