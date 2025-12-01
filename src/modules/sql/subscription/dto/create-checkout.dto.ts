import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
    @ApiProperty({
        description: 'Subscription plan type',
        example: 'chat_monthly',
        enum: ['chat_monthly', 'chat_yearly'],
        default: 'chat_monthly'
    })
    @IsString()
    @IsOptional()
    planType?: string;
}