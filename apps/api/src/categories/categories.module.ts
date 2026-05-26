import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesRepository } from './data-access/categories.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';
import { EventHandlers } from './events';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesRepository, ...CommandHandlers, ...QueryHandlers, ...EventHandlers],
})
export class CategoriesModule {}
