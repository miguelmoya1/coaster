import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { ProductsController } from './controllers/products.controller';
import { ProductsReadRepository } from './data-access/products.read.repository';
import { ProductsWriteRepository } from './data-access/products.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [ProductsController],
  providers: [ProductsReadRepository, ProductsWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class ProductsModule {}
