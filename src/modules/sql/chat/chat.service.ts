import { ModelService, SearchFields, SqlService } from '@core/sql';
import { Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { Chat } from './entities/chat.entity';
import { OwnerDto } from 'src/core/decorators/sql/owner.decorator';
import { GetChatsQueryDto } from './dto/get-chats-query.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { Op, Sequelize } from 'sequelize';
import { UserService } from '../user/user.service';
import { ChatMessageService } from '../chat-message/chat-message.service';
import { MessageType } from '../chat-message/enums/message-type.enum';
import { MsClientService } from 'src/core/modules/ms-client/ms-client.module';
import { Job } from 'src/core/core.job';

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
   * Get user's chat list with last message preview
   */
  public async getMyChats(owner: OwnerDto, query: GetChatsQueryDto) {
    const chats = await this.$db.getAllRecords({
      action: 'getMyChats',
      owner,
      options: {
        pagination: true,
        offset: query.offset,
        limit: query.limit,
        attributes: ['id', 'uid', 'user1Id', 'user2Id', 'active', 'created_at', 'updated_at'],
        order: [[Sequelize.literal('id'), 'DESC']],
        where: {
          active: true,
          [Op.or]: [
            { user1Id: { [Op.eq]: owner.id } },
            { user2Id: { [Op.eq]: owner.id } },
          ],
        },
        include: [
          {
            association: 'user1',
            attributes: ['id', 'uid', 'name', 'email', 'avatar'],
            where: { active: true },
            required: false,
          },
          {
            association: 'user2',
            attributes: ['id', 'uid', 'name', 'email', 'avatar'],
            where: { active: true },
            required: false,
          },
          {
            association: 'messages',
            attributes: ['uid', 'message', 'created_at', 'isRead', 'type', 'fromUserId'],
            where: { active: true },
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
          'uid',
          'active',
          'message',
          'isRead',
          'type',
          'reaction',
          'created_at',
        ],
        order: [[Sequelize.literal('id'), 'DESC']],
        where: {
          active: true,
          chatId: chat.getDataValue('id'),
          type: MessageType.USER,
        },
        include: [
          {
            association: 'fromUser',
            attributes: ['name', 'uid', 'id', 'avatar'],
            where: { active: true },
            required: false,
          },
          {
            association: 'toUser',
            attributes: ['name', 'uid', 'id', 'avatar'],
            where: { active: true },
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
      },
    });

    if (!chat) throw new NotFoundException('Chat not found!');

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
  }
}
