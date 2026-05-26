import { asTableId, ErrorCodes, Order } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderCreatedEvent } from '../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { CreateOrderCommand } from './create-order.command';

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, Order> {
  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: CreateOrderCommand): Promise<Order> {
    const productIds = command.dto.items.map((i) => i.productId);
    const products = await this._ordersRepository.findProductsByIds(productIds);
    if (products.length !== productIds.length) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    if (command.dto.tableId) {
      const table = await this._ordersRepository.findTableById(asTableId(command.dto.tableId));
      if (!table || table.barId !== command.barId) {
        throw new NotFoundException(ErrorCodes.TABLE_NOT_FOUND);
      }
      if (table.status === 'OCCUPIED') {
        throw new BadRequestException(ErrorCodes.TABLE_ALREADY_OCCUPIED);
      }
    }

    const priceMap = new Map(products.map((p) => [p.id, p.price]));
    const totalAmount = command.dto.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
      0,
    );

    let resolvedTableName: string | null = null;
    if (command.dto.tableId) {
      const table = await this._ordersRepository.findTableById(asTableId(command.dto.tableId));
      resolvedTableName = table?.name ?? null;
    }

    const order = await this._ordersRepository.createOrder(
      command.barId,
      command.dto,
      priceMap,
      totalAmount,
      resolvedTableName,
    );
    const mapped = OrdersMapper.toDomain(order);

    this._eventBus.publish(
      new OrderCreatedEvent(command.barId, mapped, command.dto.tableId ? asTableId(command.dto.tableId) : null),
    );

    return mapped;
  }
}
