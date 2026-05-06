import { inject, Injectable } from '@angular/core';
import {
  AddOrderItemsDto,
  asDeliveryStatus,
  asPaymentStatus,
  BarId,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  OrderId,
  OrderItemId,
  OrderStatus,
} from '@coaster/common';
import { Toast } from '../../core/services/toast';
import { OrderRepository } from '../data-access/order-repository';
import { BarOrders } from './bar-orders';

@Injectable({
  providedIn: 'root',
})
export class ManageOrder {
  readonly #orderRepository = inject(OrderRepository);
  readonly #barOrders = inject(BarOrders);
  readonly #toastService = inject(Toast);

  public async getOrder(barId: BarId, orderId: OrderId) {
    return await this.#orderRepository.getOrder(barId, orderId);
  }

  public async create(barId: BarId, dto: CreateOrderDto) {
    return await this.#orderRepository.create(barId, dto);
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto) {
    try {
      return await this.#orderRepository.addItems(barId, orderId, dto);
    } catch (e) {
      this.#toastService.error('ERR_ADD_ITEMS');
      throw e;
    }
  }

  public async payItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    const original = this.#barOrders.optimisticUpdate(orderId, (order) => {
      const items = order.items.map((i) => (i.id === itemId ? { ...i, paymentStatus: asPaymentStatus('PAID') } : i));
      return { ...order, items };
    });

    try {
      return await this.#orderRepository.payItem(barId, orderId, itemId);
    } catch (error) {
      this.#barOrders.revertUpdate(original);
      this.#toastService.error('ERR_PAYMENT');
      throw error;
    }
  }

  public async deliverItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    const original = this.#barOrders.optimisticUpdate(orderId, (order) => {
      const items = order.items.map((i) =>
        i.id === itemId ? { ...i, deliveryStatus: asDeliveryStatus('SERVED') } : i,
      );
      return { ...order, items };
    });

    try {
      return await this.#orderRepository.deliverItem(barId, orderId, itemId);
    } catch (error) {
      this.#barOrders.revertUpdate(original);
      this.#toastService.error('ERR_DELIVERY');
      throw error;
    }
  }

  public async checkout(barId: BarId, orderId: OrderId) {
    const original = this.#barOrders.optimisticUpdate(orderId, (order) => {
      const items = order.items.map((i) => ({ ...i, paymentStatus: asPaymentStatus('PAID') }));
      return { ...order, status: OrderStatus.CLOSED, items };
    });

    try {
      return await this.#orderRepository.checkout(barId, orderId);
    } catch (error) {
      this.#barOrders.revertUpdate(original);
      this.#toastService.error('ERR_CHECKOUT');
      throw error;
    }
  }

  public async cancel(barId: BarId, orderId: OrderId) {
    const original = this.#barOrders.optimisticUpdate(orderId, (order) => {
      return { ...order, status: OrderStatus.CANCELLED };
    });

    try {
      return await this.#orderRepository.cancel(barId, orderId);
    } catch (error) {
      this.#barOrders.revertUpdate(original);
      this.#toastService.error('ERR_CANCEL_ORDER');
      throw error;
    }
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto) {
    try {
      return await this.#orderRepository.moveTable(barId, orderId, dto);
    } catch (error) {
      this.#toastService.error('ERR_MOVE_TABLE');
      throw error;
    }
  }

  public async merge(barId: BarId, dto: MergeOrdersDto) {
    try {
      return await this.#orderRepository.merge(barId, dto);
    } catch (error) {
      this.#toastService.error('ERR_MERGE_TABLES');
      throw error;
    }
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    const original = this.#barOrders.optimisticUpdate(orderId, (order) => {
      const items = order.items.filter((i) => i.id !== itemId);
      return { ...order, items };
    });

    try {
      return await this.#orderRepository.removeItem(barId, orderId, itemId);
    } catch (error) {
      this.#barOrders.revertUpdate(original);
      this.#toastService.error('ERR_REMOVE_ITEM');
      throw error;
    }
  }
}
