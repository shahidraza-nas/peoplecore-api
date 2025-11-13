import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { FindOptions } from 'sequelize';
import {
  BeforeCount,
  BeforeFind,
  Column,
  CreatedAt,
  DeletedAt,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { setIncludeOptions } from './sql.utils';

@Table({
  underscored: true,
})
export class SqlModel extends Model {
  @ApiProperty({
    format: 'int32',
    description: 'ID',
    example: 1,
    readOnly: true,
  })
  declare id: number;

  @Column({ defaultValue: true })
  @ApiProperty({
    description: 'Is Active?',
    example: true,
    required: false,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  declare active: boolean;

  @CreatedAt
  @ApiProperty({
    format: 'date-time',
    description: 'Created At',
    example: '2021-01-01T00:00:00Z',
    readOnly: true,
  })
  declare created_at: Date;

  @Column
  @ApiProperty({
    format: 'int32',
    description: 'Created By',
    example: 1,
    readOnly: true,
  })
  declare created_by: number;

  @UpdatedAt
  @ApiProperty({
    format: 'date-time',
    description: 'Updated At',
    example: '2021-01-01T00:00:00Z',
    readOnly: true,
  })
  declare updated_at: Date;

  @Column
  @ApiProperty({
    format: 'int32',
    description: 'Updated By',
    example: 1,
    readOnly: true,
  })
  declare updated_by: number;

  @DeletedAt
  declare deleted_at: Date;

  @Column
  @ApiProperty({
    format: 'int32',
    description: 'Deleted By',
    example: 1,
    readOnly: true,
  })
  declare deleted_by: number;

  /**
   * Fix total count while calling findAndCountAll with include
   */
  @BeforeCount
  static fixCountWhileInclude(options: any) {
    if (
      options.include &&
      options.include.length > 0 &&
      typeof options.distinct === 'undefined'
    ) {
      options.distinct = true;
    }
  }

  /**
   * Select only specified attributes while using include
   */
  @BeforeFind
  static doBeforeFind(instance: FindOptions) {
    instance.include = instance.include
      ? setIncludeOptions(this, instance.include)
      : [];
  }
}
