import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

const SUPPORTED_DOCS = ['AADHAAR', 'PAN'] as const;
const OUTCOMES = ['VALID', 'FAILED', 'PENDING'] as const;

export class VerifyKycDto {
  @ApiProperty({
    enum: SUPPORTED_DOCS,
    example: 'AADHAAR',
    description: 'Type of document being verified',
  })
  @IsString()
  @IsIn(SUPPORTED_DOCS, {
    message: `document_type must be one of: ${SUPPORTED_DOCS.join(', ')}`,
  })
  documentType!: string;

  @ApiPropertyOptional({
    enum: OUTCOMES,
    example: 'VALID',
    description: 'Demo-only: forces the verification outcome',
  })
  @IsOptional()
  @IsIn(OUTCOMES)
  simulateOutcome?: (typeof OUTCOMES)[number];
}
