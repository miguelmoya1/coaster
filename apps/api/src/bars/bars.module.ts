import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { BarsController } from './controllers/bars.controller';
import { BarReadRepository } from './data-access/bar.read.repository';
import { BarWriteRepository } from './data-access/bar.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [BarsController],
  providers: [BarReadRepository, BarWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class BarsModule {}
