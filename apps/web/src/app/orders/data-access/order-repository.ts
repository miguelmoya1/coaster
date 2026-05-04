import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  AddOrderItemsDto,
  BarId,
  CreateOrderDto,
  DeleteResponse,
  MergeOrdersDto,
  MoveTableDto,
  Order,
  OrderId,
  OrderItemId,
} from '@coaster/common';
import { firstValueFrom, map } from 'rxjs';
import { orderMapper } from '../mappers/order.mapper';

@Injectable({
  providedIn: 'root',
})
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
    payItem: (barId: BarId, orderId: OrderId, itemId: OrderItemId) =>
      `/bars/${barId}/orders/${orderId}/items/${itemId}/pay`,
    deliverItem: (barId: BarId, orderId: OrderId, itemId: OrderItemId) =>
      `/bars/${barId}/orders/${orderId}/items/${itemId}/deliver`,
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

  public async create(barId: BarId, dto: CreateOrderDto) {
    return firstValueFrom(
      this.#http.post<Order>(this.routes.create(barId), dto).pipe(map((order) => orderMapper(order))),
    );
  }

  public async addItems(barId: BarId, orderId: OrderId, dto: AddOrderItemsDto) {
    return firstValueFrom(
      this.#http.post<Order>(this.routes.addItems(barId, orderId), dto).pipe(map((order) => orderMapper(order))),
    );
  }

  public async payItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    return firstValueFrom(
      this.#http.patch<Order>(this.routes.payItem(barId, orderId, itemId), {}).pipe(map((order) => orderMapper(order))),
    );
  }

  public async deliverItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    return firstValueFrom(
      this.#http
        .patch<Order>(this.routes.deliverItem(barId, orderId, itemId), {})
        .pipe(map((order) => orderMapper(order))),
    );
  }

  public async checkout(barId: BarId, orderId: OrderId) {
    return firstValueFrom(
      this.#http.post<Order>(this.routes.checkout(barId, orderId), {}).pipe(map((order) => orderMapper(order))),
    );
  }

  public async cancel(barId: BarId, orderId: OrderId) {
    return firstValueFrom(
      this.#http.post<Order>(this.routes.cancel(barId, orderId), {}).pipe(map((order) => orderMapper(order))),
    );
  }

  public async moveTable(barId: BarId, orderId: OrderId, dto: MoveTableDto) {
    return firstValueFrom(
      this.#http.patch<Order>(this.routes.moveTable(barId, orderId), dto).pipe(map((order) => orderMapper(order))),
    );
  }

  public async merge(barId: BarId, dto: MergeOrdersDto) {
    return firstValueFrom(
      this.#http.post<Order>(this.routes.merge(barId), dto).pipe(map((order) => orderMapper(order))),
    );
  }

  public async removeItem(barId: BarId, orderId: OrderId, itemId: OrderItemId) {
    return firstValueFrom(
      this.#http.delete<Order>(this.routes.removeItem(barId, orderId, itemId)).pipe(map((order) => orderMapper(order))),
    );
  }

  public async deleteOrder(barId: BarId, orderId: OrderId) {
    return firstValueFrom(this.#http.delete<DeleteResponse>(this.routes.delete(barId, orderId)));
  }
}
