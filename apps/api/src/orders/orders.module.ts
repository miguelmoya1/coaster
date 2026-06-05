import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { OrdersController } from './controllers/orders.controller';
import { OrdersRepository } from './data-access/orders.repository';
import { QueryHandlers } from './queries';
import { OrdersSagas } from './sagas/orders.sagas';

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, ...CommandHandlers, ...QueryHandlers, OrdersSagas],
})
export class OrdersModule {}
