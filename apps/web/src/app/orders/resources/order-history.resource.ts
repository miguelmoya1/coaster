import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, Order } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { onRealtime, patchById, Realtime, removeById, updateLoaded, upsertById } from '@coaster/core';
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

  onRealtime(realtime.orderCreated, place);
  onRealtime(realtime.orderUpdated, place);
  onRealtime(realtime.orderItemAdded, place);
  onRealtime(realtime.orderClosed, place);
  onRealtime(realtime.orderCancelled, ({ id }) =>
    updateLoaded(history, (orders) => patchById(orders, id, (order) => ({ ...order, status: OrderStatus.CANCELLED }))),
  );
  onRealtime(realtime.orderDeleted, ({ id }) => updateLoaded(history, (orders) => removeById(orders, id)));

  return history;
};
