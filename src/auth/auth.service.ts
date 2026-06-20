import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RequestOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async requestOtp(dto: RequestOtpDto) {
    const user = await this.prisma.user.upsert({
      where: { mobile: dto.mobile },
      update: {},
      create: { mobile: dto.mobile },
    });

    const code = this.generateOtp();
    const expiryMins = Number(this.config.get('OTP_EXPIRY_MINUTES')) || 5;
    const expiresAt = new Date(Date.now() + expiryMins * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.otp.updateMany({
        where: { userId: user.id, consumed: false },
        data: { consumed: true },
      }),
      this.prisma.otp.create({
        data: { userId: user.id, code, expiresAt },
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

    if (!otp || otp.code !== dto.code) {
      throw new UnauthorizedException('Invalid OTP');
    }
    if (otp.expiresAt < new Date()) {
      throw new UnauthorizedException('OTP has expired');
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
