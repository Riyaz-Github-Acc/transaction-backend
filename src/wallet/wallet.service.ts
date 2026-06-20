import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async addMoney(userId: string, amount: number) {
    return this.applyTransaction(userId, amount, TransactionType.CREDIT);
  }

  async withdraw(userId: string, amount: number) {
    return this.applyTransaction(userId, amount, TransactionType.DEBIT);
  }

  private async applyTransaction(
    userId: string,
    amount: number,
    type: TransactionType,
  ) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const current = new Prisma.Decimal(wallet.balance);
    const delta = new Prisma.Decimal(amount);
    const newBalance =
      type === TransactionType.CREDIT ? current.add(delta) : current.sub(delta);

    if (type === TransactionType.DEBIT && newBalance.lessThan(0)) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const result = await this.prisma.wallet.updateMany({
      where: { id: wallet.id, balance: current },
      data: { balance: newBalance },
    });

    if (result.count === 0) {
      throw new BadRequestException('Balance changed, please retry');
    }

    await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type,
        amount: delta,
        balanceAfter: newBalance,
      },
    });

    return {
      message:
        type === TransactionType.CREDIT
          ? 'Money added successfully'
          : 'Withdrawal successful',
      balance: newBalance,
    };
  }

  async getPassbook(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          createdAt: true,
        },
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      transactions,
    };
  }

  async getSummary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const [credits, debits] = await Promise.all([
      this.prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: TransactionType.CREDIT },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id, type: TransactionType.DEBIT },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      balance: wallet.balance,
      totalCredited: credits._sum.amount ?? 0,
      totalDebited: debits._sum.amount ?? 0,
      creditCount: credits._count,
      debitCount: debits._count,
    };
  }
}
