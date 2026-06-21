import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KYC_PROVIDER } from './types/kyc.type';
import { MockOcrProvider } from './providers/mock-ocr.provider';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [KycController],
  providers: [
    KycService,
    {
      provide: KYC_PROVIDER,
      useClass: MockOcrProvider,
    },
  ],
})
export class KycModule {}
