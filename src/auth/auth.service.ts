import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { PrismaService } from 'prisma/prisma.service';

const MAX_OTP_ATTEMPTS = 3;
const OTP_EXPIRY_MINUTES = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const user = await this.prisma.user.upsert({
      where: { mobile: dto.mobile },
      update: {},
      create: { mobile: dto.mobile },
    });

    const code = this.generateOtp();
    const hashedCode = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.otp.updateMany({
        where: { userId: user.id, consumed: false },
        data: { consumed: true },
      }),
      this.prisma.otp.create({
        data: { userId: user.id, code: hashedCode, expiresAt },
      }),
    ]);

    return {
      message: 'OTP sent successfully',
      isNewUser: !user.isVerified,
      otp: code,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
    });
    if (!user) {
      throw new BadRequestException(
        'Mobile number not found. Request OTP first.',
      );
    }

    const otp = await this.prisma.otp.findFirst({
      where: { userId: user.id, consumed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new UnauthorizedException(
        'No active OTP. Please request a new one.',
      );
    }

    if (otp.expiresAt < new Date()) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { consumed: true },
      });
      throw new UnauthorizedException('OTP has expired');
    }

    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { consumed: true },
      });
      throw new UnauthorizedException(
        'Too many incorrect attempts. Please request a new OTP.',
      );
    }

    const isMatch = await bcrypt.compare(dto.code, otp.code);
    if (!isMatch) {
      const attempts = otp.attempts + 1;
      const lockedOut = attempts >= MAX_OTP_ATTEMPTS;

      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts, consumed: lockedOut },
      });

      throw new UnauthorizedException(
        lockedOut
          ? 'Too many incorrect attempts. Please request a new OTP.'
          : `Invalid OTP. ${MAX_OTP_ATTEMPTS - attempts} attempt(s) remaining.`,
      );
    }

    if (!user.isVerified && !dto.name) {
      throw new BadRequestException(
        'Name is required to complete registration',
      );
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        ...(dto.name ? { name: dto.name } : {}),
        otps: { update: { where: { id: otp.id }, data: { consumed: true } } },
        wallet: {
          connectOrCreate: {
            where: { userId: user.id },
            create: {},
          },
        },
      },
    });

    return {
      message: 'Authentication successful',
      accessToken: this.signToken(updatedUser.id, updatedUser.mobile),
      user: {
        id: updatedUser.id,
        mobile: updatedUser.mobile,
        name: updatedUser.name,
      },
    };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private signToken(sub: string, mobile: string): string {
    return this.jwt.sign({ sub, mobile });
  }
}
