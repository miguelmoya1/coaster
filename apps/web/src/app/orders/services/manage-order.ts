import { inject, Injectable } from '@angular/core';
import {
  AddOrderItemsDto,
  BarId,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  OrderId,
  OrderItemId,
} from '@coaster/common';
import { OrderRepository } from '../data-access/order-repository';

@Injectable({
  providedIn: 'root',
})
export class ManageOrder {
  readonly #orderRepository = inject(OrderRepository);

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.getOrder(barId, orderId);
  }

  public async create(barId: BarId, dto: CreateOrderDto) {
    return await this.#orderRepository.create(barId, dto);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto) {
    return await this.#orderRepository.addItems(barId, orderId, dto);
  }

  public async payItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    return await this.#orderRepository.payItem(barId, orderId, itemId);
  }

  public async deliverItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    return await this.#orderRepository.deliverItem(barId, orderId, itemId);
  }

  public async checkout(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.checkout(barId, orderId);
  }

  public async cancel(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.cancel(barId, orderId);
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto) {
    return await this.#orderRepository.moveTable(barId, orderId, dto);
  }

  public async merge(barId: BarId, dto: MergeOrdersDto) {
    return await this.#orderRepository.merge(barId, dto);
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    return await this.#orderRepository.removeItem(barId, orderId, itemId);
  }
}
