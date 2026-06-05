import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { ProductsController } from './controllers/products.controller';
import { ProductsRepository } from './data-access/products.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ProductsController],
  providers: [ProductsRepository, ...CommandHandlers, ...QueryHandlers],
})
export class ProductsModule {}
