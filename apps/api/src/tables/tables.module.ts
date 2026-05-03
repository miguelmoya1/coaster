import { Module } from '@nestjs/common';
import { TablesController } from './controllers/tables.controller';
import { TablesRepository } from './data-access/tables.repository';
import { TablesService } from './services/tables.service';

@Module({
  controllers: [TablesController],
  providers: [TablesService, TablesRepository],
  exports: [TablesService],
})
export class TablesModule {}
