import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { ShiftsController } from './controllers/shifts.controller';
import { ShiftsReadRepository } from './data-access/shifts.read.repository';
import { ShiftsWriteRepository } from './data-access/shifts.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ShiftsController],
  providers: [ShiftsReadRepository, ShiftsWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class ShiftsModule {}
