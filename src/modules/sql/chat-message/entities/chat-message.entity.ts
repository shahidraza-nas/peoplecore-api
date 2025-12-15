import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import {
  BeforeCreate,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { uuid } from 'src/core/core.utils';
import { User } from '../../user/entities/user.entity';
import { Chat } from '../../chat/entities/chat.entity';
import { MessageType } from '../enums/message-type.enum';

@Table
export class ChatMessage extends SqlModel {
  @Column({ unique: true })
  @ApiProperty({
    description: 'Unique ID',
    example: 'msg_a926d382-6741-4d95-86cf-1f5c421cf654',
    readOnly: true,
  })
  @IsString()
  declare uid: string;

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

  // TODO: Add type column to database first
  // @Column({
  //   type: DataType.ENUM(...Object.values(MessageType)),
  //   defaultValue: MessageType.USER,
  // })
  // @ApiProperty({
  //   enum: MessageType,
  //   description: 'Message Type',
  //   example: MessageType.USER,
  // })
  // @IsEnum(MessageType)
  // @IsOptional()
  // declare type: MessageType;

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

  @Column({ type: DataType.JSON, allowNull: true, defaultValue: {} })
  @ApiProperty({ description: 'Reactions on the message', example: { '👍': [1, 2] } })
  declare reactions: Record<string, number[]>;

  @BeforeCreate
  static setUuid(instance: ChatMessage) {
    instance.uid = `msg_${uuid()}`;
  }
}
