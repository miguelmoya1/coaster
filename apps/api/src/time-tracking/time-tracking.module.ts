import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { TimeEntriesController } from './controllers/time-entries.controller';
import { TimeEntriesReadRepository } from './data-access/time-entries.read.repository';
import { TimeEntriesWriteRepository } from './data-access/time-entries.write.repository';
import { QueryHandlers } from './queries';
import { ChainSealService } from './services/chain-seal.service';

@Module({
  imports: [CqrsModule],
  controllers: [TimeEntriesController],
  providers: [
    TimeEntriesReadRepository,
    TimeEntriesWriteRepository,
    ChainSealService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class TimeTrackingModule {}
