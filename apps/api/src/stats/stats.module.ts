import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StatsController } from './controllers/stats.controller';
import { StatsRepository } from './data-access/stats.repository';
import { StatsQueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [StatsController],
  providers: [StatsRepository, ...StatsQueryHandlers],
})
export class StatsModule {}
