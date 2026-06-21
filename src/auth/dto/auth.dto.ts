import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '9876543210', description: '10-digit mobile number' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid mobile number' })
  mobile!: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '9876543210', description: '10-digit mobile number' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid mobile number' })
  mobile!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code!: string;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Required only for new users',
  })
  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;
}
