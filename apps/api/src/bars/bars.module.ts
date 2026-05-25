import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BarsController } from './controllers/bars.controller';
import { BarRepository } from './data-access/bar.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [BarsController],
  providers: [BarRepository, ...CommandHandlers, ...QueryHandlers],
})
export class BarsModule {}
