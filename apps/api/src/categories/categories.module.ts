import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesRepository } from './data-access/categories.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesRepository, ...CommandHandlers, ...QueryHandlers],
})
export class CategoriesModule {}
