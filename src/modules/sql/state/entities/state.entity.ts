import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPositive, IsString } from 'class-validator';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Index,
  Table,
} from 'sequelize-typescript';
import { Country } from '../../country/entities/country.entity';

@Table
export class State extends SqlModel {
  @Column
  @ForeignKey(() => Country)
  @ApiProperty({
    description: 'Country ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  declare country_id: number;

  @Column(DataType.STRING(20))
  @Index
  @ApiProperty({
    description: 'State Name',
    example: 'Alabama',
  })
  @IsString()
  declare name: string;

  @Column(DataType.STRING(2))
  @Index
  @ApiProperty({
    description: 'State Code',
    example: 'AL',
  })
  @IsString()
  declare code: string;

  @BelongsTo(() => Country)
  declare country: Country;
}
