import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { IsUnique } from '@core/sql/sql.unique-validator';

export class RegisterDto {
  @ApiProperty({ description: 'First Name', example: 'Ross' })
  @IsString()
  first_name: string;

  @ApiProperty({ description: 'Last Name', example: 'Geller' })
  @IsString()
  last_name: string;

  @ApiProperty({ description: 'Email', example: 'ross.geller@gmail.com' })
  @IsUnique('User', {
    message: 'User with the same email address already exists.',
  })
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone Code', example: '+1', required: false })
  @IsOptional()
  @IsString()
  phone_code?: string;

  @ApiProperty({ description: 'Phone', example: '9999999999', required: false })
  @IsOptional()
  @IsNumberString()
  phone?: string;

  @ApiProperty({ description: 'Password', example: '123456' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Enable 2FA?', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  enable_2fa?: boolean;

  @ApiProperty({ description: 'Send Email?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  send_email?: boolean;

  @ApiProperty({ description: 'Send SMS?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  send_sms?: boolean;

  @ApiProperty({ description: 'Send Push?', example: true, required: false })
  @IsBoolean()
  @IsOptional()
  send_push?: boolean;
}
