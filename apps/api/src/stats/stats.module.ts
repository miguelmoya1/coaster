import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StatsController } from './controllers/stats.controller';
import { StatsReadRepository } from './data-access/stats.read.repository';
import { StatsWriteRepository } from './data-access/stats.write.repository';
import { StatsQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [StatsController],
  providers: [StatsReadRepository, StatsWriteRepository, ...StatsQueryHandlers],
})
export class StatsModule {}
