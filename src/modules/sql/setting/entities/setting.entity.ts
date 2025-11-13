import { SqlModel } from '@core/sql/sql.model';
import { IsUnique } from '@core/sql/sql.unique-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString } from 'class-validator';
import { Column, DataType, Index, Table } from 'sequelize-typescript';
import { sqlDialect, SqlDialect } from 'src/app.config';

@Table
export class Setting extends SqlModel {
  @Column
  @Index('settings_name')
  @ApiProperty({
    description: 'Setting Name',
    example: 'timezone',
  })
  @IsString()
  @IsUnique('Setting')
  declare name: string;

  @Column
  @ApiProperty({
    description: 'Setting Display Name',
    example: 'System Timezone',
  })
  @IsString()
  declare display_name: string;

  @Column
  @ApiProperty({
    description: 'Setting Value',
    example: 'America/New_York',
  })
  @IsString()
  declare value: string;

  @Column({ defaultValue: true })
  @ApiProperty({
    description: 'Editable?',
    example: true,
  })
  @IsBoolean()
  declare editable: boolean;

  @Column({ defaultValue: 1 })
  @ApiProperty({
    description: 'Group ID',
    example: 1,
  })
  @IsInt()
  declare group_id: number;

  @Column({ defaultValue: 0 })
  @ApiProperty({
    description: 'Sort Order',
    example: 1,
  })
  @IsInt()
  declare sort_no: number;

  @Column({
    type: sqlDialect === SqlDialect.Postgres ? DataType.JSONB : DataType.TEXT,
    defaultValue: sqlDialect === SqlDialect.Postgres ? {} : '{}',
    get(this: Setting): Record<string, any> {
      try {
        const value = this.getDataValue('options');
        if (sqlDialect === SqlDialect.Postgres) {
          return value || { type: 'text', required: true };
        }
        return value ? JSON.parse(value) : { type: 'text', required: true };
      } catch {
        return null;
      }
    },
  })
  @ApiProperty({ description: 'Settings Input Options' })
  declare options: Record<string, any>;

  static async getValue(name: string): Promise<string> {
    try {
      const setting = await Setting.findOne({
        where: { name },
      });
      return setting?.value || null;
    } catch {
      return null;
    }
  }
}
