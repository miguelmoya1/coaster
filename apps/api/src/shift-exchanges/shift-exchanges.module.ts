import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ShiftExchangesRepository } from './data-access/shift-exchanges.repository';
import { ShiftExchangesController } from './controllers/shift-exchanges.controller';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ShiftExchangesController],
  providers: [ShiftExchangesRepository, ...CommandHandlers, ...QueryHandlers],
})
export class ShiftExchangesModule {}
