import { Module } from '@nestjs/common';
import { ShiftsController } from './controllers/shifts.controller';
import { ShiftsService } from './services/shifts.service';
import { ShiftsRepository } from './data-access/shifts.repository';

@Module({
  controllers: [ShiftsController],
  providers: [ShiftsService, ShiftsRepository],
})
export class ShiftsModule {}
