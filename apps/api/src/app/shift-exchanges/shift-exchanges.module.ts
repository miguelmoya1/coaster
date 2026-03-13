import { Module } from '@nestjs/common';
import { ShiftExchangesRepository } from './data-access/shift-exchanges.repository';
import { ShiftExchangesController } from './controllers/shift-exchanges.controller';
import { ShiftExchangesService } from './services/shift-exchanges.service';

@Module({
  controllers: [ShiftExchangesController],
  providers: [ShiftExchangesRepository, ShiftExchangesService],
})
export class ShiftExchangesModule {}
