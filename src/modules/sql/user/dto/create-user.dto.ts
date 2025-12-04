import { ApiProperty, PickType } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { User } from '../entities/user.entity';

export class CreateUserDto extends PickType(User, [
  'first_name',
  'last_name',
  'email',
  'phone_code',
  'phone',
  'password',
  'role',
  'avatar',
  'enable_2fa',
  'send_email',
  'send_sms',
  'send_push',
] as const) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar File',
  })
  @Allow()
  avatar_file?: any;
}
