import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { ShiftExchangesController } from './controllers/shift-exchanges.controller';
import { ShiftExchangesReadRepository } from './data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from './data-access/shift-exchanges.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ShiftExchangesController],
  providers: [ShiftExchangesReadRepository, ShiftExchangesWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class ShiftExchangesModule {}
