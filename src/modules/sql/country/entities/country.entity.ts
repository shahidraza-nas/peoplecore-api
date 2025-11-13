import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Column, DataType, Index, Table } from 'sequelize-typescript';

@Table
export class Country extends SqlModel {
  @Column(DataType.STRING(20))
  @Index
  @ApiProperty({
    description: 'Country name',
    example: 'United States',
  })
  @IsString()
  declare name: string;

  @Column(DataType.STRING(2))
  @Index
  @ApiProperty({
    description: 'Country code',
    example: 'US',
  })
  @IsString()
  declare code: string;
}
