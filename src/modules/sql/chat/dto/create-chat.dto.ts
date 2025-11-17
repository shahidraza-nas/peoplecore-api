import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({
    description: 'UID of the user to chat with',
    example: 'user_123456',
  })
  @IsString()
  @IsNotEmpty()
  userUid: string;
}
