import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeCreate,
  BelongsTo,
  Column,
  ForeignKey,
  HasMany,
  Index,
  Table,
} from 'sequelize-typescript';
import { uuid } from 'src/core/core.utils';
import { User } from '../../user/entities/user.entity';
import { ChatMessage } from '../../chat-message/entities/chat-message.entity';

@Table
export class Chat extends SqlModel {
  @Column({ unique: 'uid' })
  @ApiProperty({
    description: 'Unique ID',
    example: 'chat_a926d382-6741-4d95-86cf-1f5c421cf654',
    readOnly: true,
  })
  @Index('chat_uid')
  declare uid: string;

  @ForeignKey(() => User)
  @Column({ allowNull: false })
  @ApiProperty({ description: 'User 1 ID', example: 1 })
  declare user1Id: number;

  @BelongsTo(() => User, 'user1Id')
  user1: User;

  @ForeignKey(() => User)
  @Column({ allowNull: false })
  @ApiProperty({ description: 'User 2 ID', example: 2 })
  declare user2Id: number;

  @BelongsTo(() => User, 'user2Id')
  user2: User;

  @HasMany(() => ChatMessage)
  messages: ChatMessage[];

  @BeforeCreate
  static setUuid(instance: Chat) {
    instance.uid = `chat_${uuid()}`;
  }
}
