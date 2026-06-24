import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { TablesController } from './controllers/tables.controller';
import { TablesReadRepository } from './data-access/tables.read.repository';
import { TablesWriteRepository } from './data-access/tables.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [TablesController],
  providers: [TablesReadRepository, TablesWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class TablesModule {}
