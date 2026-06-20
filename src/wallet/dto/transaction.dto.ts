import { IsNumber, IsPositive, Max } from 'class-validator';

export class TransactionDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Max(1000000, { message: 'Amount exceeds the per-transaction limit' })
  amount!: number;
}
