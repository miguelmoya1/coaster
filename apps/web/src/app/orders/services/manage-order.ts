import { inject, Service } from '@angular/core';
import type {
  AddOrderItemsDto,
  BarId,
  BulkUpdateDto,
  CheckoutOrderDto,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  OrderId,
  OrderItemId,
} from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Service()
export class ManageOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.getOrder(barId, orderId);
  }

  public async create(barId: BarId, dto: CreateOrderDto): Promise<void> {
    await this.#orderRepository.create(barId, dto);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    await this.#orderRepository.addItems(barId, orderId, dto);
  }

  public async bulkUpdate(barId: BarId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    await this.#orderRepository.bulkUpdate(barId, orderId, dto);
  }

  public async checkout(barId: BarId, orderId: OrderId, dto: CheckoutOrderDto): Promise<void> {
    await this.#orderRepository.checkout(barId, orderId, dto);
  }

  public async cancel(barId: BarId, orderId: OrderId): Promise<void> {
    await this.#orderRepository.cancel(barId, orderId);
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    await this.#orderRepository.moveTable(barId, orderId, dto);
  }

  public async merge(barId: BarId, dto: MergeOrdersDto): Promise<void> {
    await this.#orderRepository.merge(barId, dto);
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    await this.#orderRepository.removeItem(barId, orderId, itemId);
  }
}
