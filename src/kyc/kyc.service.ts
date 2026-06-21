import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { KYC_PROVIDER } from './types/kyc.type';
import type { KycProvider } from './types/kyc.type';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(KYC_PROVIDER) private readonly provider: KycProvider,
  ) {}

  async verify(
    userId: string,
    documentType: string,
    file: Express.Multer.File,
    simulateOutcome?: 'VALID' | 'FAILED' | 'PENDING',
  ) {
    if (!file) {
      throw new BadRequestException('A document file is required');
    }

    const verificationId = `kyc_${randomUUID().slice(0, 20)}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING' },
    });

    const result = await this.provider.verifyDocument(
      file,
      documentType,
      verificationId,
      simulateOutcome,
    );

    const statusMap: Record<string, 'VERIFIED' | 'FAILED' | 'PENDING'> = {
      VALID: 'VERIFIED',
      FAILED: 'FAILED',
      PENDING: 'PENDING',
    };
    const kycStatus = statusMap[result.status] ?? 'PENDING';
    const isVerified = kycStatus === 'VERIFIED';

    const data = {
      documentType,
      verificationId,
      referenceId: result.referenceId,
      status: result.status,
      extractedName: result.fields?.name,
      extractedDob: result.fields?.dob,
      documentNumber: result.fields?.uid ?? result.fields?.pan,
      rawFields: result.fields,
      verifiedAt: isVerified ? new Date() : null,
    };

    await this.prisma.kyc.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus },
    });

    return {
      status: result.status,
      kycStatus,
      message: result.message,
      documentType: result.documentType,
      extracted: {
        name: result.fields?.name,
        dob: result.fields?.dob,
        documentNumber: result.fields?.uid ?? result.fields?.pan,
      },
      qualityChecks: result.qualityChecks,
      fraudChecks: result.fraudChecks,
    };
  }

  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycStatus: true,
        kyc: {
          select: {
            documentType: true,
            status: true,
            extractedName: true,
            documentNumber: true,
            verifiedAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { kycStatus: user.kycStatus, details: user.kyc };
  }
}
