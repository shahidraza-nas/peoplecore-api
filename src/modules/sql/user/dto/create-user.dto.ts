import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Allow } from 'class-validator';
import { User } from '../entities/user.entity';

export class CreateUserDto extends OmitType(User, [] as const) {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Avatar File',
  })
  @Allow()
  avatar_file?: any;
}
