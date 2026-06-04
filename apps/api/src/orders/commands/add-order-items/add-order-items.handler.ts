import type { Order } from '@coaster/common';
import { ErrorCodes } from '../../../core';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { OrdersRepository } from '../../data-access/orders.repository';
import { OrderItemsAddedEvent } from '../../../events';
import { OrdersMapper } from '../../mappers/orders.mapper';
import { AddOrderItemsCommand } from './add-order-items.command';

@CommandHandler(AddOrderItemsCommand)
export class AddOrderItemsHandler implements ICommandHandler<AddOrderItemsCommand, void> {
  readonly #logger = new Logger(AddOrderItemsHandler.name);

  constructor(
    private readonly _ordersRepository: OrdersRepository,
    private readonly _eventBus: EventBus,
  ) {}

  async execute(command: AddOrderItemsCommand): Promise<void> {
    this.#logger.debug(`Executing addOrderItems...`);
    const existingOrder = await this._ordersRepository.findById(command.orderId);
    if (!existingOrder || existingOrder.barId !== command.barId) {
      throw new NotFoundException(ErrorCodes.ORDER_NOT_FOUND);
    }
    if (existingOrder.status !== 'OPEN') {
      throw new BadRequestException(ErrorCodes.ORDER_NOT_OPEN);
    }

    const productIds = command.dto.items.map((i) => i.productId);
    const products = await this._ordersRepository.findProductsByIds(productIds);
    if (products.length !== productIds.length) {
      throw new NotFoundException(ErrorCodes.PRODUCT_NOT_FOUND);
    }

    const priceMap = new Map(products.map((p) => [p.id, p.price]));
    const additionalAmount = command.dto.items.reduce(
      (sum, item) => sum + (priceMap.get(item.productId) ?? 0) * item.quantity,
      0,
    );

    const order = await this._ordersRepository.addItemsToOrder(
      command.orderId,
      additionalAmount,
      command.dto,
      priceMap,
      existingOrder.totalAmount,
    );

    const mapped = OrdersMapper.toDomain(order);
    this.#logger.debug(`Publishing OrderItemsAddedEvent...`);
    this._eventBus.publish(
      new OrderItemsAddedEvent(
        command.barId,
        mapped,
        command.dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      ),
    );
  }
}
