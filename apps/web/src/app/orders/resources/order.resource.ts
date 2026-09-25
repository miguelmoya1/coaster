import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, Order, OrderId } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { onRealtime, Realtime, updateLoaded } from '@coaster/core';
import { OrderRepository } from '../data-access/order-repository';
import { orderMapper } from '../mappers/order.mapper';
import { withTip } from './order-events';

export const orderResource = (
  establishmentId: Signal<EstablishmentId | undefined>,
  orderId: Signal<OrderId | undefined>,
) => {
  const repository = inject(OrderRepository);
  const realtime = inject(Realtime);

  const order = httpResource(
    () => {
      const establishment = establishmentId();
      const id = orderId();
      return establishment && id ? repository.routes.get(establishment, id) : undefined;
    },
    { parse: orderMapper },
  );

  const replace = (next: Order) => {
    if (next.id === orderId()) {
      updateLoaded(order, () => next);
    }
  };

  onRealtime(realtime.orderCreated, replace);
  onRealtime(realtime.orderUpdated, replace);
  onRealtime(realtime.orderItemAdded, replace);
  onRealtime(realtime.orderClosed, replace);
  onRealtime(realtime.orderCancelled, (cancelled) => {
    if (cancelled.id === orderId()) {
      updateLoaded(order, (current) => ({ ...current, status: OrderStatus.CANCELLED }));
    }
  });
  onRealtime(realtime.orderTipUpdated, ({ orderId: id, tipAmount }) => {
    if (id === orderId()) {
      updateLoaded(order, withTip(tipAmount));
    }
  });
  onRealtime(realtime.orderAdjustmentsUpdated, ({ orderId: id }) => {
    if (id === orderId()) {
      order.reload();
    }
  });
  onRealtime(realtime.orderDeleted, ({ id }) => {
    if (id === orderId()) {
      order.reload();
    }
  });

  return order;
};
