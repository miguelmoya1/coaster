import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { OrdersController } from './controllers/orders.controller';
import { OrdersReadRepository } from './data-access/orders.read.repository';
import { OrdersWriteRepository } from './data-access/orders.write.repository';
import { QueryHandlers } from './queries';
import { OrdersSagas } from './sagas/orders.sagas';

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [OrdersReadRepository, OrdersWriteRepository, ...CommandHandlers, ...QueryHandlers, OrdersSagas],
})
export class OrdersModule {}
