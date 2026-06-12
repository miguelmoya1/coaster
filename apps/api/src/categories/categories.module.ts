import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { CategoriesController } from './controllers/categories.controller';
import { CategoriesReadRepository } from './data-access/categories.read.repository';
import { CategoriesWriteRepository } from './data-access/categories.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [CategoriesController],
  providers: [CategoriesReadRepository, CategoriesWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class CategoriesModule {}
