import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { Order } from '../models/order.interface';
import { OrderStatus } from '../models/order-status.type';
import {
  onRealtime,
  patchById,
  Realtime,
  removeById,
  updateLoaded,
  upsertById,
  type EstablishmentId,
} from '@coaster/core';
import { OrderRepository } from '../data-access/order-repository';
import { orderArrayMapper } from '../mappers/order.mapper';

export const todayIso = (): string => new Date().toISOString().split('T')[0];

const isoDateOf = (moment: string | Date): string => new Date(moment).toISOString().split('T')[0];

export const orderHistoryResource = (establishmentId: Signal<EstablishmentId | undefined>, date: Signal<string>) => {
  const repository = inject(OrderRepository);
  const realtime = inject(Realtime);

  const history = httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.listByDate(id, date()) : undefined;
    },
    { parse: orderArrayMapper },
  );

  const place = (order: Order) => {
    if (order.establishmentId === establishmentId() && order.createdAt && isoDateOf(order.createdAt) === date()) {
      updateLoaded(history, (orders) => upsertById(orders, order));
    }
  };

  onRealtime(realtime.on<Order>('orderCreated'), place);
  onRealtime(realtime.on<Order>('orderUpdated'), place);
  onRealtime(realtime.on<Order>('orderItemAdded'), place);
  onRealtime(realtime.on<Order>('orderClosed'), place);
  onRealtime(realtime.on<{ id: string } | Order>('orderCancelled'), ({ id }) =>
    updateLoaded(history, (orders) => patchById(orders, id, (order) => ({ ...order, status: OrderStatus.CANCELLED }))),
  );
  onRealtime(realtime.on<{ id: string }>('orderDeleted'), ({ id }) =>
    updateLoaded(history, (orders) => removeById(orders, id)),
  );

  return history;
};
