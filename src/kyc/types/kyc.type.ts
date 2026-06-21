export interface OcrResult {
  status: string;
  referenceId?: string;
  documentType?: string;
  fields: Record<string, any>;
  qualityChecks?: Record<string, any>;
  fraudChecks?: Record<string, any>;
  message?: string;
}

export interface KycProvider {
  verifyDocument(
    file: Express.Multer.File,
    documentType: string,
    verificationId: string,
    simulateOutcome?: 'VALID' | 'FAILED' | 'PENDING',
  ): Promise<OcrResult>;
}

export const KYC_PROVIDER = Symbol('KYC_PROVIDER');
