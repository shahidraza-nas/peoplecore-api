import { SqlModel } from '@core/sql/sql.model';
import { IsUnique } from '@core/sql/sql.unique-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { Column, DataType, Index, Table } from 'sequelize-typescript';

@Table
export class Template extends SqlModel {
  @Column
  @Index('template_name')
  @ApiProperty({
    description: 'Template Name',
    example: 'new_account',
  })
  @IsString()
  @IsUnique('Template')
  declare name: string;

  @Column
  @ApiProperty({
    description: 'Template Title',
    example: 'New Account',
  })
  @IsString()
  declare title: string;

  @Column({ defaultValue: true })
  @ApiProperty({
    description: 'Send Email?',
    example: true,
  })
  @IsBoolean()
  declare send_email: boolean;

  @Column
  @ApiProperty({
    description: 'Email Subject',
    example: 'New account created',
  })
  @IsString()
  declare email_subject: string;

  @Column(DataType.TEXT)
  @ApiProperty({
    description: 'Email Body',
    example: '<p>HTML content</p>',
  })
  @IsString()
  declare email_body: string;

  @Column({ defaultValue: true })
  @ApiProperty({
    description: 'Send SMS?',
    example: true,
  })
  @IsBoolean()
  declare send_sms: boolean;

  @Column
  @ApiProperty({
    description: 'SMS Body',
    example: 'SMS content',
  })
  @IsString()
  declare sms_body: string;
}
