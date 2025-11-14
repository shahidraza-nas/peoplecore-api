import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '../enums/message-type.enum';

export class CreateMessageDto {
  @ApiProperty({ description: 'To User UID', example: 'user_123456' })
  @IsNotEmpty()
  @IsString()
  toUserUid: string;

  @ApiProperty({ description: 'Chat UID', example: 'chat_123456' })
  @IsNotEmpty()
  @IsString()
  chatUid: string;

  @ApiProperty({ description: 'Message text', example: 'Hello there!' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    enum: MessageType,
    description: 'Message type',
    example: MessageType.USER,
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}
