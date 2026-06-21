import { IsIn, IsOptional, IsString } from 'class-validator';

const SUPPORTED_DOCS = ['AADHAAR', 'PAN'] as const;
const OUTCOMES = ['VALID', 'FAILED', 'PENDING'] as const;

export class VerifyKycDto {
  @IsString()
  @IsIn(SUPPORTED_DOCS, {
    message: `document_type must be one of: ${SUPPORTED_DOCS.join(', ')}`,
  })
  documentType!: string;

  @IsOptional()
  @IsIn(OUTCOMES)
  simulateOutcome?: (typeof OUTCOMES)[number];
}
