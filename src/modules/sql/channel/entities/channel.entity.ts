import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';
import { Column, DataType, HasMany, Index, Table } from 'sequelize-typescript';
import { ChannelMember } from '../../channel-member/entities/channel-member.entity';
import { Message } from '../../message/entities/message.entity';

@Table
export class Channel extends SqlModel {
  @Column({ type: DataType.STRING })
  @Index
  @ApiProperty({
    description: 'Channel name',
    example: 'Urban Teams',
  })
  @IsString()
  declare name: string;

  @Column({ type: DataType.STRING })
  @ApiProperty({
    description: 'Type of channel: team, department, project, direct',
    example: 'team'
  })
  @IsString()
  declare type: string;

  @Column({ type: DataType.STRING })
  @ApiProperty({ description: 'Channel description', example: 'Team chat for Urban Project' })
  declare description?: string;

  @Column({ type: DataType.UUID, unique: 'uid' })
  @ApiProperty({
    description: 'Unique channel UID',
    example: 'e1b2c3d4-5678-90ab-cdef-1234567890ab',
    readOnly: true,
  })
  @IsUUID()
  declare uid: string;

  @HasMany(() => ChannelMember)
  members: ChannelMember[];

  @HasMany(() => Message)
  messages: Message[];
}
