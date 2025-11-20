import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Phone Code',
    example: '+91',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(4)
  @IsNotEmpty()
  phoneCode: string;

  @ApiProperty({
    description: 'Phone',
    example: '7736520877',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  hashKey: string;

  @ApiProperty({
    description: 'Firebase token',
    default: '',
  })
  @IsOptional()
  fcm: string;
}
