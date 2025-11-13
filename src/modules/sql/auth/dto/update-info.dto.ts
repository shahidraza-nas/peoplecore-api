import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class UpdateInfoDto {
  @ApiProperty({
    description: 'Session ID',
    example: 1,
    required: false,
  })
  @IsOptional()
  session_id: string;

  @ApiProperty({
    description: 'Additional session info',
    example: {
      device: 'iOS',
      device_token: 'token',
    },
  })
  @IsObject()
  info: Record<string, any>;
}
