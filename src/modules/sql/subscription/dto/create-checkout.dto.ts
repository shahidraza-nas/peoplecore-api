import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCheckoutDto {
    @ApiProperty({
        description: 'Payment amount in dollars',
        example: 10,
        default: 10
    })
    @IsNumber()
    @IsOptional()
    amount?: number;

    @ApiProperty({
        description: 'Plan type',
        example: 'chat_monthly',
        default: 'chat_monthly'
    })
    @IsString()
    @IsOptional()
    planType?: string;
}