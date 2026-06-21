import { Injectable } from '@nestjs/common';
import { KycProvider, OcrResult } from '../types/kyc.type';

@Injectable()
export class MockOcrProvider implements KycProvider {
  async verifyDocument(
    file: Express.Multer.File,
    documentType: string,
    verificationId: string,
    simulateOutcome: 'VALID' | 'FAILED' | 'PENDING' = 'VALID',
  ): Promise<OcrResult> {
    const sampleFields: Record<string, Record<string, any>> = {
      AADHAAR: {
        uid: 'XXXX-XXXX-3717',
        name: 'John Doe',
        dob: '1997-05-12',
        gender: 'Male',
        address: 'S/O Josh Doe, Gwalior, Madhya Pradesh, 474009',
      },
      PAN: {
        pan: 'DUXPR7763F',
        name: 'John Doe',
        father: 'Josh Doe',
        dob: '2004-10-02',
      },
    };

    const fields =
      simulateOutcome === 'VALID'
        ? (sampleFields[documentType] ?? sampleFields.AADHAAR)
        : {};

    const messages: Record<string, string> = {
      VALID: `${documentType} document is valid`,
      FAILED: `${documentType} document could not be verified`,
      PENDING: `${documentType} verification is under review`,
    };

    return {
      status: simulateOutcome,
      referenceId: String(Math.floor(1000 + Math.random() * 9000)),
      documentType,
      fields,
      qualityChecks: {
        blur: simulateOutcome === 'FAILED',
        face_present: simulateOutcome === 'VALID',
        qr_present: simulateOutcome === 'VALID' && documentType === 'AADHAAR',
        black_and_white: false,
      },
      fraudChecks: {
        is_screenshot: simulateOutcome === 'FAILED',
        is_photo_of_screen: false,
      },
      message: messages[simulateOutcome],
    };
  }
}
