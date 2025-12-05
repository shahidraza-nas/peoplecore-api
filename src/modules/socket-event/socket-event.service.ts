import { Injectable } from '@nestjs/common';
import { Job } from 'src/core/core.job';
import { RedisPropagatorService } from 'src/core/modules/socket/redis-propagator/redis-propagator.service';
import { SocketStateService } from 'src/core/modules/socket/socket-state/socket-state.service';
import { ChatMessage } from '../sql/chat-message/entities/chat-message.entity';

@Injectable()
export class SocketEventService {
  constructor(
    private redisPropagatorService: RedisPropagatorService,
    private socketStateService: SocketStateService,
  ) {}

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

  /**
   * Broadcast when a user comes online.
   * @param {Job} job - received object contains payload, owner etc
   * @returns {Promise<{error: boolean}>}
   */
  async broadcastUserOnline(job: Job) {
    const { userId } = job.payload as { userId: number };

    console.log(`Broadcasting online status for USER_${userId} to all clients`);
    this.redisPropagatorService.propagateEvent({
      event: 'user.online',
      data: { userId },
    });

    return { error: false };
  }

  /**
   * Broadcast when a user goes offline.
   * @param {Job} job - received object contains payload, owner etc
   * @returns {Promise<{error: boolean}>}
   */
  async broadcastUserOffline(job: Job) {
    const { userId } = job.payload as { userId: number };

    console.log(`Broadcasting offline status for USER_${userId} to all clients`);
    this.redisPropagatorService.propagateEvent({
      event: 'user.offline',
      data: { userId },
    });

    return { error: false };
  }

  /**
   * Send list of currently online users to requesting client.
   * @param {Job} job - received object contains payload, owner etc
   * @returns {Promise<{error: boolean}>}
   */
  async sendOnlineUsersList(job: Job) {
    const { requestingUserId } = job.payload as { requestingUserId: number };
    const onlineUserIds = this.socketStateService.getOnlineUserIds();
    this.redisPropagatorService.propagateEvent({
      userId: `${requestingUserId}`,
      event: 'onlineUsers.list',
      data: { userIds: onlineUserIds },
    });
    return { error: false };
  }

  /**
   * Broadcast when messages are marked as read.
   * @param {Job} job - received object contains payload, owner etc
   * @returns {Promise<{error: boolean}>}
   */
  async sendMessagesRead(job: Job) {
    const { chatUid, fromUserId, toUserId } = job.payload as {
      chatUid: string;
      fromUserId: number;
      toUserId: number;
    };

    this.redisPropagatorService.propagateEvent({
      userId: `${toUserId}`,
      event: 'messages.read',
      data: { chatUid, readBy: fromUserId },
    });

    return { error: false };
  }
}
