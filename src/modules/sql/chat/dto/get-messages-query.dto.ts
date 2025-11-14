import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMessagesQueryDto {
  @ApiProperty({ description: 'Offset for pagination', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number = 0;

  @ApiProperty({ description: 'Limit for pagination', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}
