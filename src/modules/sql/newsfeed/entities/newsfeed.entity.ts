import { SqlModel } from '@core/sql/sql.model';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Column, DataType, ForeignKey, Index, Table } from 'sequelize-typescript';
import { User } from '../../user/entities/user.entity';

@Table
export class Newsfeed extends SqlModel {
  @Column({ type: DataType.STRING })
  @Index
  @ApiProperty({ description: 'Title of the Newsfeed', example: 'Office Closed for Holidays' })
  @IsString()
  declare title: string;

  @Column(DataType.TEXT)
  @ApiProperty({ description: 'Content of the Newsfeed', example: 'Our office will be closed from Dec 24 to Jan 2.' })
  @IsString()
  declare content: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.INTEGER })
  @ApiProperty({ description: 'ID of the user who posted the Newsfeed', example: '101' })
  declare authorId: number;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  @ApiProperty({ description: 'Is it pinned to the top?', example: false })
  @IsOptional()
  declare pinned?: boolean;

  @Column({ type: DataType.DATE, defaultValue: DataType.NOW })
  @ApiProperty({ description: 'Publish date', example: '2025-11-19T09:34:56.000Z' })
  declare publishDate?: string;

  @Column({ type: DataType.BOOLEAN, defaultValue: false })
  @ApiProperty({ description: 'Is the newsfeed published?', example: false })
  @IsOptional()
  declare published?: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  @ApiProperty({ description: 'Tags for the newsfeed (comma-separated)', example: 'holiday,office' })
  @IsOptional()
  declare tags?: string;
}
