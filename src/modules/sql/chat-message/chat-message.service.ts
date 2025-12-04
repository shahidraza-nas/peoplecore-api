import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { ChatMessage } from './entities/chat-message.entity';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { Job } from 'src/core/core.job';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserService } from '../user/user.service';
import { ChatService } from '../chat/chat.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { Op } from 'sequelize';
import { Role } from '../user/role.enum';
import { APPEVENTS } from 'src/constants';

@Injectable()
export class ChatMessageService extends ModelService<ChatMessage> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<ChatMessage> = ['message'];

  constructor(
    db: SqlService<ChatMessage>,
    private readonly msClient: MsClientService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {
    super(db);
  }

  /**
   * Validate message data and save
   */
  async validateMessageAndSave(job: Job) {
    try {
      const { owner, payload } = job;
      const data = payload as CreateMessageDto;

      const [{ data: toUser }, { data: chatDetails }] = await Promise.all([
        this.userService.$db.findOneRecord({
          action: 'findone',
          owner,
          options: {
            where: {
              uid: data.toUserUid,
              role: Role.User,
              active: true,
            },
          },
        }),
        this.chatService.findOne({
          action: 'findone',
          owner,
          payload: {
            where: {
              uid: data.chatUid,
              active: true,
            },
          },
        }),
      ]);

      if (!toUser) throw new NotFoundException('User not found!');
      if (!chatDetails) throw new NotFoundException('Chat not found!');

      // Emit to save message via microservice
      await this.msClient.executeJob(
        APPEVENTS.MESSAGE,
        new Job({
          app: process.env.APP_ID,
          action: 'saveMessage',
          owner,
          payload: {
            toUser,
            chatDetails,
            message: data.message,
          },
        }),
      );
      
      return { error: false, data: { validated: true, chatId: chatDetails.id } };
    } catch (error) {
      console.error('[ChatMessageService] validateMessageAndSave failed:', error.message);
      return { error, data: null };
    }
  }

  /**
   * Save message and emit to socket server
   */
  async saveMessage(job: Job) {
    try {
      const { owner, payload } = job;
      const { chatDetails, toUser, message } = payload as {
        toUser: any;
        chatDetails: any;
        message: string;
      };

      const { data: createMessageDetails, error } = await this.create({
        action: 'create-message',
        owner,
        payload: {
          populate: ['fromUser', 'toUser', 'chat'],
        },
        body: {
          fromUserId: owner.id,
          toUserId: toUser.id,
          message,
          chatId: chatDetails.id
        },
      });

      if (error || !createMessageDetails) {
        throw error || new Error('Failed to create message');
      }

      const { data: messageDetails, error: fetchError } = await this.$db.findOneRecord({
        action: 'findone',
        owner,
        options: {
          pagination: false,
          attributes: [
            'id',
            'uid',
            'active',
            'message',
            'isRead',
            'toUserId',
            'fromUserId',
            'created_at',
            'chatId',
          ],
          where: {
            active: true,
            id: createMessageDetails.getDataValue('id'),
          },
          include: [
            {
              association: 'fromUser',
              attributes: ['name', 'uid', 'id', 'avatar'],
              required: false, 
            },
            {
              association: 'toUser',
              attributes: ['name', 'uid', 'id', 'avatar'],
              required: false,
            },
          ],
        },
      });

      if (fetchError || !messageDetails) {
        console.error('[ChatMessageService] Failed to fetch message details:', fetchError?.message || 'Message not found');
        throw fetchError || new Error('Message details not found');
      }

      const messagePayload = messageDetails.toJSON();

      // Emit to socket server
      await this.msClient.executeJob(
        APPEVENTS.SOCKET,
        new Job({
          app: process.env.APP_ID,
          action: 'sendMessage',
          owner,
          payload: messagePayload,
        }),
      );
      
      await this.msClient.executeJob(
        APPEVENTS.NOTIFICATION,
        new Job({
          app: process.env.APP_ID,
          action: 'sendPushNotification',
          owner,
          payload: {
            toUserId: toUser.id,
            title: 'New Message',
            body: `${owner.name} sent you a message.`,
            data: {
              chatUid: chatDetails.uid,
              type: 'chat_message',
            },
          },
        }),
      );
      
      return { error: false, data: messagePayload };
    } catch (error) {
      console.error('[ChatMessageService] saveMessage failed:', error.message);
      return { error, data: null };
    }
  }

  /**
   * Save reaction to a message
   */
  async saveReaction(job: Job) {
    try {
      const data = job.payload as CreateReactionDto;
      const owner = job.owner as OwnerDto;

      const [{ data: message }] = await Promise.all([
        this.findOne({
          action: 'findone',
          owner,
          payload: {
            populate: ['fromUser', 'toUser', 'chat'],
            where: {
              uid: data.messageUid,
              [Op.or]: [
                { fromUserId: { [Op.eq]: owner.id } },
                { toUserId: { [Op.eq]: owner.id } },
              ],
            },
          },
        }),
      ]);

      if (!message) throw new NotFoundException('Message not found!');

      await this.update({
        action: 'update',
        owner,
        id: message.getDataValue('id'),
        body: {
          reaction: data.reaction,
        },
      });

      const { data: messageDetails } = await this.$db.findOneRecord({
        action: 'findone',
        owner,
        options: {
          pagination: false,
          attributes: [
            'uid',
            'active',
            'message',
            'isRead',
            'type',
            'toUserId',
            'fromUserId',
            'reaction',
            'created_at',
          ],
          where: {
            active: true,
            id: message.getDataValue('id')
          },
          include: [
            {
              association: 'fromUser',
              attributes: ['name', 'uid', 'id', 'avatar'],
              where: { active: true },
            },
            {
              association: 'toUser',
              attributes: ['name', 'uid', 'id', 'avatar'],
              where: { active: true },
            },
          ],
        },
      });

      await this.msClient.executeJob(
        APPEVENTS.SOCKET,
        new Job({
          app: 'socket-server',
          action: 'sendMessage',
          owner,
          payload: {
            ...messageDetails.toJSON(),
            reaction: data.reaction,
            type: 'reaction',
          },
        }),
      );
    } catch (error) {
      console.log(error);
    }
  }
}
