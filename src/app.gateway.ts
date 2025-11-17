import { INestApplication, Logger, UseInterceptors } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { SessionModule } from './core/modules/session/session.module';
import { SessionService } from './core/modules/session/session.service';
import { RedisPropagatorInterceptor } from './core/modules/socket/redis-propagator/redis-propagator.interceptor';
import { RedisPropagatorService } from './core/modules/socket/redis-propagator/redis-propagator.service';
import {
  AuthenticatedSocket,
  SocketStateAdapter,
} from './core/modules/socket/socket-state/socket-state.adapter';
import { SocketStateService } from './core/modules/socket/socket-state/socket-state.service';
import { UserModule } from './modules/sql/user/user.module';
import { UserService } from './modules/sql/user/user.service';
import { MsClientService } from './core/modules/ms-client/ms-client.service';
import { APPEVENTS } from './constants/events.constants';
import { Job } from './core/core.job';
import { SendMessageDto } from './modules/sql/chat/dto/send-message.dto';

export const initAdapters = (app: INestApplication): INestApplication => {
  const socketStateService = app.get(SocketStateService);
  const redisPropagatorService = app.get(RedisPropagatorService);
  const sessionService = app.select(SessionModule).get(SessionService);

  const userService = app.select(UserModule).get(UserService);
  app.useWebSocketAdapter(
    new SocketStateAdapter(
      app,
      socketStateService,
      redisPropagatorService,
      userService,
      sessionService
    )
  );

  return app;
};

@WebSocketGateway()
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly msClient: MsClientService) { }

  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');

  @UseInterceptors(RedisPropagatorInterceptor)
  @SubscribeMessage('events')
  handleEvents(): any {
    return { event: 'events', data: 'socket working' };
  }

  afterInit() {
    this.logger.log('Socket server ready');
  }

  @UseInterceptors(RedisPropagatorInterceptor)
  @SubscribeMessage('user.message')
  async handleMessageEvent(
    client: AuthenticatedSocket,
    data: SendMessageDto,
  ) {
    this.logger.log(`Received message from: USER_${client.auth?.id}`);
    await this.msClient.executeJob(
      APPEVENTS.MESSAGE,
      new Job({
        action: 'sendMessage',
        app: process.env.APP_ID,
        owner: client.auth,
        payload: data,
      }),
    );
  }

  @UseInterceptors(RedisPropagatorInterceptor)
  @SubscribeMessage('user.typing')
  async handleTypingEvent(client: AuthenticatedSocket, data: any) {
    this.logger.log(`Typing from USER_${client.auth?.id} to USER_${data.toUserId}, isTyping: ${data.isTyping}`);
    await this.msClient.executeJob(
      APPEVENTS.SOCKET,
      new Job({
        app: process.env.APP_ID,
        action: 'sendUserTyping',
        owner: client.auth,
        payload: { toUserId: data.toUserId, isTyping: data.isTyping, chatUid: data.chatUid },
      }),
    );
  }

  @UseInterceptors(RedisPropagatorInterceptor)
  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(client: AuthenticatedSocket) {
    this.logger.log(`User ${client.auth?.id} requesting online users list`);
    await this.msClient.executeJob(
      APPEVENTS.SOCKET,
      new Job({
        app: process.env.APP_ID,
        action: 'sendOnlineUsersList',
        owner: client.auth,
        payload: { requestingUserId: client.auth?.id },
      }),
    );
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: USER_${client.auth?.id}, Socket: ${client.id}`);
    if (client.auth?.id) {
      await this.msClient.executeJob(
        APPEVENTS.SOCKET,
        new Job({
          app: process.env.APP_ID,
          action: 'broadcastUserOffline',
          owner: client.auth,
          payload: { userId: client.auth.id },
        }),
      );
      this.logger.log(`Broadcasted offline status for USER_${client.auth.id}`);
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: USER_${client.auth?.id}, Socket: ${client.id}, broadcasting online status`);
    if (client.auth?.id) {
      await this.msClient.executeJob(
        APPEVENTS.SOCKET,
        new Job({
          app: process.env.APP_ID,
          action: 'broadcastUserOnline',
          owner: client.auth,
          payload: { userId: client.auth.id },
        }),
      );
      this.logger.log(`Broadcasted online status for USER_${client.auth.id}`);
    }
  }
}
