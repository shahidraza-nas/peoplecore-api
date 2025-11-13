import { Inject, Injectable } from '@nestjs/common';
import { OnModuleDestroy } from '@nestjs/common/interfaces';
import { Observable } from 'rxjs';

import {
  REDIS_PUBLISHER_CLIENT,
  REDIS_SUBSCRIBER_CLIENT,
} from './redis.constants';
import { RedisClient } from './redis.providers';

export interface RedisSubscribeMessage {
  readonly message: string;
  readonly channel: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  public constructor(
    @Inject(REDIS_SUBSCRIBER_CLIENT)
    private readonly redisSubscriberClient: RedisClient,
    @Inject(REDIS_PUBLISHER_CLIENT)
    private readonly redisPublisherClient: RedisClient,
  ) {}

  onModuleDestroy() {
    this.redisSubscriberClient.disconnect();
    this.redisPublisherClient.disconnect();
  }

  public fromEvent<T>(eventName: string): Observable<T> {
    return new Observable<T>((observer) => {
      this.redisSubscriberClient
        .subscribe(eventName)
        .then(() => {
          const handler = (channel: string, message: string) => {
            if (channel === eventName) {
              try {
                observer.next(JSON.parse(message) as T);
              } catch (err) {
                observer.error(err);
              }
            }
          };

          this.redisSubscriberClient.on('message', handler);

          // Clean up on unsubscribe
          return () => {
            this.redisSubscriberClient.off('message', handler);
            this.redisSubscriberClient.unsubscribe(eventName).catch(() => {});
          };
        })
        .catch((err) => observer.error(err));
    });
  }

  public async publish(channel: string, value: unknown): Promise<number> {
    return this.redisPublisherClient.publish(channel, JSON.stringify(value));
  }
}
