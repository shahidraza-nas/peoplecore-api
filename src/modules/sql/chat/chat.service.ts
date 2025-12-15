import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { Chat } from './entities/chat.entity';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { Op, Sequelize } from 'sequelize';
import { UserService } from '../user/user.service';
import { ChatMessageService } from '../chat-message/chat-message.service';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.service';
import { Job } from 'src/core/core.job';
import { APPEVENTS } from 'src/constants';
import { GetChatsQueryDto } from './dto/get-chats-query.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';

@Injectable()
export class ChatService extends ModelService<Chat> {
  /**
   * searchFields
   * @property array of fields to include in search
   */
  searchFields: SearchFields<Chat> = [];

  constructor(
    db: SqlService<Chat>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => ChatMessageService))
    private readonly messageService: ChatMessageService,
    private readonly msClient: MsClientService,
  ) {
    super(db);
  }

  /**
   * Find or create a chat between two users
   */
  public async findOrCreateChat(owner: OwnerDto, userUid: string) {
    const { data: toUser, error: userError } = await this.userService.findOne({
      action: 'findToUser',
      owner,
      payload: {
        where: { uid: userUid },
      },
    });

    if (userError || !toUser) {
      throw new NotFoundException('User not found!');
    }

    const toUserId = toUser.getDataValue('id');
    if (owner.id === toUserId) {
      throw new Error('Cannot create a chat with yourself');
    }

    let chat = await this.$db.findOneRecord({
      options: {
        where: {
          [Op.or]: [
            { user1Id: owner.id, user2Id: toUserId },
            { user1Id: toUserId, user2Id: owner.id },
          ],
        },
        include: [
          {
            association: 'user1',
            attributes: ['id', 'uid', 'name', 'email', 'avatar'],
            required: false,
          },
          {
            association: 'user2',
            attributes: ['id', 'uid', 'name', 'email', 'avatar'],
            required: false,
          },
        ],
      },
    });

    if (chat.data) {
      return { error: false, data: chat.data };
    }

    const { data: newChat, error: chatError } = await this.create({
      action: 'create-chat',
      owner,
      payload: {
        populate: ['user1', 'user2'],
      },
      body: {
        user1Id: owner.id,
        user2Id: toUserId,
      },
    });

    if (chatError || !newChat) {
      throw new Error('Failed to create chat');
    }

    return { error: false, data: newChat };
  }

  /**
   * Get user's chat list with last message preview and unread count
   */
  public async getMyChats(owner: OwnerDto, query: GetChatsQueryDto) {
    const chats = await this.$db.getAllRecords({
      action: 'getMyChats',
      owner,
      options: {
        pagination: true,
        offset: query.offset,
        limit: query.limit,
        attributes: [
          'id',
          'uid',
          'user1Id',
          'user2Id',
          'created_at',
          'updated_at',
          [
            Sequelize.literal(
              `(SELECT COUNT(*) FROM chat_messages WHERE chat_id = "Chat"."id" AND to_user_id = ${owner.id} AND is_read = false)`,
            ),
            'unread_count',
          ],
        ],
        order: [[Sequelize.literal('id'), 'DESC']],
        where: {
          [Op.or]: [
            { user1Id: { [Op.eq]: owner.id } },
            { user2Id: { [Op.eq]: owner.id } },
          ],
        },
        include: [
          {
            association: 'user1',
            attributes: ['id', 'uid', 'name', 'email', 'avatar'],
            required: false,
          },
          {
            association: 'user2',
            attributes: ['id', 'uid', 'name', 'email', 'avatar'],
            required: false,
          },
          {
            association: 'messages',
            attributes: ['uid', 'message', 'created_at', 'isRead', 'fromUserId'],
            limit: 1,
            order: [['created_at', 'DESC']],
            required: false,
          },
        ],
      },
    });

    return chats;
  }

  /**
   * Get messages for a specific chat
   */
  public async getChatMessages(
    owner: OwnerDto,
    chatUid: string,
    query: GetMessagesQueryDto,
  ) {
    const [{ data: chat }] = await Promise.all([
      await this.findOne({
        action: 'get-chat-details',
        owner,
        payload: {
          where: {
            uid: chatUid,
            [Op.or]: [
              { user1Id: { [Op.eq]: owner.id } },
              { user2Id: { [Op.eq]: owner.id } },
            ],
          },
        },
      }),
    ]);

    if (!chat) throw new NotFoundException('This chat does not exist!');

    const messages = await this.messageService.$db.getAllRecords({
      action: 'getChatMessages',
      owner,
      options: {
        pagination: true,
        offset: query.offset,
        limit: query.limit,
        attributes: [
          'id',
          'uid',
          'message',
          'isRead',
          'fromUserId',
          'toUserId',
          'created_at',
          'reactions',
        ],
        order: [[Sequelize.literal('id'), 'DESC']],
        where: {
          chatId: chat.getDataValue('id')
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

    return messages;
  }

  /**
   * Mark all messages in a chat as read
   */
  public async readAllMessages(job: Job) {
    try {
      const { owner, payload } = job;
      const { chatUid } = payload;

      const { data: chat } = await this.findOne({
        action: 'findOne',
        owner,
        payload: {
          where: {
            uid: chatUid,
            [Op.or]: [
              { user1Id: { [Op.eq]: owner.id } },
              { user2Id: { [Op.eq]: owner.id } },
            ],
          },
          populate: ['user1', 'user2'],
        },
      });

      if (!chat) {
        return { error: new NotFoundException('Chat not found!'), data: null };
      }

      await this.messageService.$db.updateBulkRecords({
        owner,
        options: {
          where: {
            chatId: chat.getDataValue('id'),
            toUserId: owner.id,
            isRead: false,
          },
        },
        body: {
          isRead: true,
        },
      });

      const otherUserId = chat.getDataValue('user1Id') === owner.id
        ? chat.getDataValue('user2Id')
        : chat.getDataValue('user1Id');

      // Emit event to the other user (sender) that their messages were read
      await this.msClient.executeJob(
        APPEVENTS.SOCKET,
        new Job({
          app: process.env.APP_ID,
          action: 'sendMessagesRead',
          owner,
          payload: {
            chatUid,
            fromUserId: owner.id,
            toUserId: otherUserId,
          },
        }),
      );

      // Also emit to current user (reader) to update their unread count
      await this.msClient.executeJob(
        APPEVENTS.SOCKET,
        new Job({
          app: process.env.APP_ID,
          action: 'sendMessagesRead',
          owner,
          payload: {
            chatUid,
            fromUserId: owner.id,
            toUserId: owner.id,
          },
        }),
      );

      return { error: null, data: { chatUid, messagesRead: true } };
    } catch (error) {
      return { error, data: null };
    }
  }

  /**
   * Get total unread messages count for a user
   */
  public async getUnreadMessagesCount(userId: number): Promise<number> {
    try {
      const result = await this.messageService.$db.countAllRecords({
        action: 'countUnreadMessages',
        options: {
          where: {
            toUserId: userId,
            isRead: false,
          },
        },
      });
      return result.count || 0;
    } catch (error) {
      return 0;
    }
  }
}
