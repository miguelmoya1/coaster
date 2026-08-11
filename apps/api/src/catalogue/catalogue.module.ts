import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { CatalogueController } from './controllers/catalogue.controller';
import { CatalogueRepository } from './data-access/catalogue.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [CatalogueController],
  providers: [CatalogueRepository, ...CommandHandlers, ...QueryHandlers],
})
export class CatalogueModule {}
