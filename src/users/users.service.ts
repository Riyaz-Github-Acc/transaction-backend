import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        mobile: true,
        name: true,
        isVerified: true,
        createdAt: true,
        wallet: {
          select: { balance: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      mobile: user.mobile,
      name: user.name,
      isVerified: user.isVerified,
      memberSince: user.createdAt,
      wallet: {
        balance: (user.wallet as { balance: number } | null | undefined)?.balance ?? 0,
      },
    };
  }
}
