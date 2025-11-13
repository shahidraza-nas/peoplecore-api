import { SqlModel } from '@core/sql/sql.model';
import { IsUnique } from '@core/sql/sql.unique-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { DataTypes } from 'sequelize';
import { Column, Index, Table } from 'sequelize-typescript';

@Table
export class Page extends SqlModel {
  @Column
  @Index('page_name')
  @ApiProperty({
    description: 'Page Name',
    example: 'about_us',
  })
  @IsString()
  @IsUnique('Page')
  declare name: string;

  @Column
  @ApiProperty({
    description: 'Page Title',
    example: 'About Us',
  })
  @IsString()
  declare title: string;

  @Column(DataTypes.TEXT)
  @ApiProperty({
    description: 'Page Content',
    example: 'About us sample content',
  })
  @IsString()
  declare content: string;

  @Column({ defaultValue: true })
  @ApiProperty({
    description: 'Allow HTML Content?',
    example: true,
  })
  @IsBoolean()
  declare allow_html: boolean;
}
