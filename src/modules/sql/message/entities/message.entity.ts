import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID } from 'class-validator';
import { BelongsTo, Column, DataType, ForeignKey, Index, Table } from 'sequelize-typescript';
import { Channel } from '../../channel/entities/channel.entity';
import { User } from '../../user/entities/user.entity';

@Table
export class Message extends SqlModel {

  @ForeignKey(() => Channel)
  @Column({ type: DataType.INTEGER })
  @ApiProperty({ description: 'Channel ID', example: 1 })
  @IsInt()
  declare channelId: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  @ApiProperty({ description: 'Sender user ID', example: 1 })
  @IsInt()
  declare userId: number;

  @Column({ type: DataType.STRING })
  @ApiProperty({ description: 'Message content', example: 'Hello team!' })
  declare content: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  declare isRead?: boolean;

  @Column({ type: DataType.UUID, unique: 'uid' })
  @ApiProperty({
    description: 'Unique ID',
    example: 'a926d382-6741-4d95-86cf-1f5c421cf654',
    readOnly: true,
  })
  @IsUUID()
  declare uid: string;

  @BelongsTo(() => Channel)
  channel: Channel;

  @BelongsTo(() => User)
  user: User;
}
