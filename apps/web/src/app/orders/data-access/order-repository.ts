import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AddOrderItemsDto,
  BarId,
  BulkUpdateDto,
  CheckoutOrderDto,
  CreateOrderDto,
  MergeOrdersDto,
  MoveTableDto,
  Order,
  OrderId,
  OrderItemId,
} from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { orderMapper } from '../mappers/order.mapper';

@Service()
export class OrderRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (barId: BarId) => `/bars/${barId}/orders`,
    listByStatus: (barId: BarId, status: string) => `/bars/${barId}/orders?status=${status}`,
    listByDate: (barId: BarId, date: string) => `/bars/${barId}/orders?date=${date}`,
    get: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}`,
    create: (barId: BarId) => `/bars/${barId}/orders`,
    delete: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}`,
    addItems: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}/items`,
    bulkUpdate: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}/items/bulk`,
    checkout: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}/checkout`,
    cancel: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}/cancel`,
    moveTable: (barId: BarId, orderId: OrderId) => `/bars/${barId}/orders/${orderId}/move-table`,
    merge: (barId: BarId) => `/bars/${barId}/orders/merge`,
    removeItem: (barId: BarId, orderId: OrderId, itemId: OrderItemId) =>
      `/bars/${barId}/orders/${orderId}/items/${itemId}`,
  };

  public async getOrder(barId: BarId, orderId: OrderId) {
    return firstValueFrom(
      this.#http.get<Order>(this.routes.get(barId, orderId)).pipe(map((order) => orderMapper(order))),
    );
  }

  public async create(barId: BarId, dto: CreateOrderDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.create(barId), dto));
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.addItems(barId, orderId), dto));
  }

  public async bulkUpdate(barId: BarId, orderId: OrderId, dto: BulkUpdateDto): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(this.routes.bulkUpdate(barId, orderId), dto));
  }

  public async checkout(barId: BarId, orderId: OrderId, dto: CheckoutOrderDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.checkout(barId, orderId), dto));
  }

  public async cancel(barId: BarId, orderId: OrderId): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.cancel(barId, orderId), {}));
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto): Promise<void> {
    return firstValueFrom(this.#http.patch<void>(this.routes.moveTable(barId, orderId), dto));
  }

  public async merge(barId: BarId, dto: MergeOrdersDto): Promise<void> {
    return firstValueFrom(this.#http.post<void>(this.routes.merge(barId), dto));
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.removeItem(barId, orderId, itemId)));
  }

  public async deleteOrder(barId: BarId, orderId: OrderId): Promise<void> {
    return firstValueFrom(this.#http.delete<void>(this.routes.delete(barId, orderId)));
  }
}
