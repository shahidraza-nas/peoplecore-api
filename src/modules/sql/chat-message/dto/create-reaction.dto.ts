import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateReactionDto {
  @ApiProperty({ description: 'Message UID', example: 'msg_123456' })
  @IsNotEmpty()
  @IsString()
  messageUid: string;

  @ApiProperty({ description: 'Reaction emoji', example: '❤️' })
  @IsNotEmpty()
  @IsString()
  reaction: string;
}
