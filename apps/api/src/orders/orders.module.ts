import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { OrdersController } from './controllers/orders.controller';
import { OrdersRepository } from './data-access/orders.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, ...CommandHandlers, ...QueryHandlers],
})
export class OrdersModule {}
