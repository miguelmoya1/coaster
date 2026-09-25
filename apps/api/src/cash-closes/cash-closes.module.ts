import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { CashClosesController } from './controllers/cash-closes.controller';
import { CashClosesReadRepository } from './data-access/cash-closes.read.repository';
import { CashClosesWriteRepository } from './data-access/cash-closes.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [CashClosesController],
  providers: [CashClosesReadRepository, CashClosesWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class CashClosesModule {}
