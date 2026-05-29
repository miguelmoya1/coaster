import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { BarsController } from './controllers/bars.controller';
import { BarRepository } from './data-access/bar.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [BarsController],
  providers: [BarRepository, ...CommandHandlers, ...QueryHandlers],
})
export class BarsModule {}
