import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ShiftsController } from './controllers/shifts.controller';
import { ShiftsRepository } from './data-access/shifts.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ShiftsController],
  providers: [ShiftsRepository, ...CommandHandlers, ...QueryHandlers],
})
export class ShiftsModule {}
