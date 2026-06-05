import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { TablesController } from './controllers/tables.controller';
import { TablesRepository } from './data-access/tables.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [TablesController],
  providers: [TablesRepository, ...CommandHandlers, ...QueryHandlers],
})
export class TablesModule {}
