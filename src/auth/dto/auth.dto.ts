import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid mobile number' })
  mobile!: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid mobile number' })
  mobile!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  code!: string;

  @IsOptional()
  @IsString()
  @Length(2, 50)
  name?: string;
}
