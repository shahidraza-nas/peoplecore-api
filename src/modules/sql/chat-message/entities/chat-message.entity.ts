import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeCreate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from 'sequelize-typescript';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { uuid } from 'src/core/core.utils';
import { User } from '../../user/entities/user.entity';
import { Chat } from '../../chat/entities/chat.entity';
import { MessageType } from '../enums/message-type.enum';

@Table
export class ChatMessage extends SqlModel {
  @Column({ unique: 'uid' })
  @ApiProperty({
    description: 'Unique ID',
    example: 'msg_a926d382-6741-4d95-86cf-1f5c421cf654',
    readOnly: true,
  })
  @IsString()
  @Index('message_uid')
  declare uid: string;

  @Column
  @ApiProperty({
    description: 'reaction',
    example: '**',
    required: false,
  })
  @IsOptional()
  @IsString()
  declare reaction?: string;

  @Column({ allowNull: true, defaultValue: false })
  @ApiProperty({ description: 'Is message read', example: false })
  declare isRead: boolean;

  @Column({ allowNull: false, type: DataType.TEXT })
  @ApiProperty({
    description: 'Message text',
    example: 'Hello there!',
  })
  @IsString()
  @IsOptional()
  declare message: string;

  @Column({
    type: DataType.ENUM(...Object.values(MessageType)),
    allowNull: false,
    defaultValue: MessageType.USER,
  })
  @ApiProperty({
    enum: MessageType,
    description: 'Message type',
    example: MessageType.USER,
  })
  @IsOptional()
  @IsEnum(MessageType)
  declare type: MessageType;

  @Column({ allowNull: false })
  @ApiProperty({ description: 'From User ID', example: 1 })
  @IsNumber()
  @IsOptional()
  @ForeignKey(() => User)
  declare fromUserId: number;

  @BelongsTo(() => User, 'fromUserId')
  fromUser: User;

  @Column({ allowNull: false })
  @ApiProperty({ description: 'To User ID', example: 2 })
  @IsNumber()
  @IsOptional()
  @ForeignKey(() => User)
  declare toUserId: number;

  @BelongsTo(() => User, 'toUserId')
  toUser: User;

  @Column({ allowNull: false })
  @ForeignKey(() => Chat)
  @ApiProperty({ description: 'Chat ID', example: 1 })
  declare chatId: number;

  @BelongsTo(() => Chat, 'chatId')
  chat: Chat;

  @BeforeCreate
  static setUuid(instance: ChatMessage) {
    instance.uid = `msg_${uuid()}`;
  }
}
