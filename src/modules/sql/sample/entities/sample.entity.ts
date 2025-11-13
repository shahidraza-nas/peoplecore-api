import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, Index, Table } from 'sequelize-typescript';

@Table
export class Sample extends SqlModel {
  @Column
  @Index
  @ApiProperty({
    description: 'Sample name',
    example: 'United States',
  })
  @IsString()
  name: string;
}
