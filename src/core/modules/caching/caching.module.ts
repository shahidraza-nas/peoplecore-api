import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheableMemory } from 'cacheable';
import { Keyv } from 'keyv';
import redisConfig from '../../../config/redis';
import { CachingService } from './caching.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule.forRoot({ load: [redisConfig] })],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          stores: [
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
            createKeyv(config.get('redis').uri),
          ],
        };
      },
      isGlobal: true,
    }),
  ],
  exports: [CachingService],
  providers: [CachingService],
})
export class CachingModule {}
