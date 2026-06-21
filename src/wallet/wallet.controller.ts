import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { TransactionDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('add')
  @ApiOperation({ summary: 'Add money to wallet' })
  addMoney(@CurrentUser('sub') userId: string, @Body() dto: TransactionDto) {
    return this.walletService.addMoney(userId, dto.amount);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw money from wallet' })
  withdraw(@CurrentUser('sub') userId: string, @Body() dto: TransactionDto) {
    return this.walletService.withdraw(userId, dto.amount);
  }

  @Get('passbook')
  @ApiOperation({ summary: 'Paginated transaction history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  passbook(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getPassbook(
      userId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Wallet totals (SQL aggregates)' })
  summary(@CurrentUser('sub') userId: string) {
    return this.walletService.getSummary(userId);
  }
}
