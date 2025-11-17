import { Injectable } from '@nestjs/common';
import { Job } from 'src/core/core.job';
import { RedisPropagatorService } from 'src/core/modules/socket/redis-propagator/redis-propagator.service';
import { ChatMessage } from '../sql/chat-message/entities/chat-message.entity';

@Injectable()
export class SocketEventService {
  constructor(private redisPropagatorService: RedisPropagatorService) {}

  /**
   * Used to receive trigger from microservice when a message has to be sent to browser client.
   * @param {Job} job - received object contains payload, owner etc
   * @returns {Promise<{error: boolean}>}
   */
  async sendMessage(job: Job) {
    const message = job.payload as ChatMessage & {
      fromUser?: any;
      toUser?: any;
    };

    // Emit to recipient
    this.redisPropagatorService.propagateEvent({
      userId: `${message.toUserId}`,
      event: 'user.message',
      data: { message },
    });

    // Emit to sender (for multi-device sync)
    this.redisPropagatorService.propagateEvent({
      userId: `${message.fromUserId}`,
      event: 'user.message',
      data: { message },
    });

    return { error: false };
  }

  /**
   * Used to receive trigger from microservice when a user is typing.
   * @param {Job} job - received object contains payload, owner etc
   * @returns {Promise<{error: boolean}>}
   */
  async sendUserTyping(job: Job) {
    const { toUserId, isTyping, chatUid } = job.payload as {
      toUserId: number;
      isTyping: boolean;
      chatUid: string;
    };

    this.redisPropagatorService.propagateEvent({
      userId: `${toUserId}`,
      event: 'user.typing',
      data: {
        userId: job.owner.id,
        chatUid,
        isTyping,
      },
    });

    return { error: false };
  }
}
