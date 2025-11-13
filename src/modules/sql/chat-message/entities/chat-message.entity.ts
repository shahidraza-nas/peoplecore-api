import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, Index, Table } from 'sequelize-typescript';

@Table
export class ChatMessage extends SqlModel {
  
  @Column({ unique: 'uuid' })
  @ApiProperty({ description: 'Unique ID', example: 'a926d382-6741-4d95-86cf-1f5c421cf654', readOnly: true })
  declare uuid: string;
  
  @Column
  @Index
  @ApiProperty({
    description: 'ChatMessage name',
    example: 'United States',
  })
  @IsString()
  name: string;
}
