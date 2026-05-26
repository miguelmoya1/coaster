import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './controllers/orders.controller';
import { OrdersRepository } from './data-access/orders.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';
import { EventHandlers } from './events';
import { OrdersSagas } from './sagas/orders.sagas';

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, ...CommandHandlers, ...QueryHandlers, ...EventHandlers, OrdersSagas],
})
export class OrdersModule {}
