import { ApiProperty, PartialType, PickType } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UpdateUserDto extends PartialType(
  PickType(User, [
    'first_name',
    'last_name',
    'email',
    'phone_code',
    'phone',
    'avatar',
    'enable_2fa',
    'send_email',
    'send_sms',
    'send_push',
  ] as const),
) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar File',
  })
  avatar_file?: any;
}
