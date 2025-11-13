import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Index, Table } from 'sequelize-typescript';

@Table
export class Chat extends SqlModel {

  @Column({ unique: 'uuid' })
  @ApiProperty({ description: 'Unique ID', example: 'a926d382-6741-4d95-86cf-1f5c421cf654', readOnly: true })
  declare uuid: string;

  @Column
  @ApiProperty({ description: 'User one ID', example: '1' })
  declare user_one_id: string;

  @Column
  @ApiProperty({ description: 'User two ID', example: '2' })
  declare user_two_id: string;
}
