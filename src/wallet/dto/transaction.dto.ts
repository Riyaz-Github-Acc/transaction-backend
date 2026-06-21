import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max } from 'class-validator';

export class TransactionDto {
  @ApiProperty({
    example: 500,
    description: 'Amount in INR (max 2 decimal places, up to 1,000,000)',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Max(1000000, { message: 'Amount exceeds the per-transaction limit' })
  amount!: number;
}
