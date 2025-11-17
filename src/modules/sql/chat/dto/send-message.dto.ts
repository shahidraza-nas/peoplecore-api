import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({
    description: 'UID of the recipient user',
    example: 'user_a926d382',
  })
  @IsNotEmpty()
  @IsString()
  toUserUid: string;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message: string;
}
