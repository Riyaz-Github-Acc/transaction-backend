import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerifyKycDto } from './dto/kyc.dto';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('verify')
  @ApiOperation({ summary: 'Upload a document and verify KYC' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: { type: 'string', example: 'AADHAAR' },
        simulateOutcome: {
          type: 'string',
          enum: ['VALID', 'FAILED', 'PENDING'],
          example: 'VALID',
        },
      },
      required: ['file', 'documentType'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  verify(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyKycDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpeg|jpg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.kycService.verify(
      userId,
      dto.documentType,
      file,
      dto.simulateOutcome,
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current KYC status' })
  getStatus(@CurrentUser('sub') userId: string) {
    return this.kycService.getStatus(userId);
  }
}
