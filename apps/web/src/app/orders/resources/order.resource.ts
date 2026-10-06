import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { Order, OrderAdjustment, OrderId } from '../models/order.interface';
import { OrderStatus } from '../models/order-status.type';
import { onRealtime, Realtime, updateLoaded, type EstablishmentId } from '@coaster/core';
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

  onRealtime(realtime.on<Order>('orderCreated'), replace);
  onRealtime(realtime.on<Order>('orderUpdated'), replace);
  onRealtime(realtime.on<Order>('orderItemAdded'), replace);
  onRealtime(realtime.on<Order>('orderClosed'), replace);
  onRealtime(realtime.on<{ id: string } | Order>('orderCancelled'), (cancelled) => {
    if (cancelled.id === orderId()) {
      updateLoaded(order, (current) => ({ ...current, status: OrderStatus.CANCELLED }));
    }
  });
  onRealtime(realtime.on<{ orderId: string; tipAmount: number }>('orderTipUpdated'), ({ orderId: id, tipAmount }) => {
    if (id === orderId()) {
      updateLoaded(order, withTip(tipAmount));
    }
  });
  onRealtime(
    realtime.on<{ orderId: string; adjustments: OrderAdjustment[] }>('orderAdjustmentsUpdated'),
    ({ orderId: id }) => {
      if (id === orderId()) {
        order.reload();
      }
    },
  );
  onRealtime(realtime.on<{ id: string }>('orderDeleted'), ({ id }) => {
    if (id === orderId()) {
      order.reload();
    }
  });
  onRealtime(realtime.reconnected, () => order.reload());

  return order;
};
