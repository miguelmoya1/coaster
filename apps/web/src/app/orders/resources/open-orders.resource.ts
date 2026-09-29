import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import { asOrderId, type Order, type OrderAdjustment } from '../models/order.interface';
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
import { withTip } from './order-events';

export const openOrdersResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(OrderRepository);
  const realtime = inject(Realtime);

  const orders = httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.listByStatus(id, OrderStatus.OPEN) : undefined;
    },
    { parse: orderArrayMapper },
  );

  const place = (order: Order) => {
    if (order.establishmentId !== establishmentId()) {
      return;
    }

    updateLoaded(orders, (list) =>
      order.status === OrderStatus.OPEN ? upsertById(list, order) : removeById(list, order.id),
    );
  };

  const drop = ({ id }: { id: string }) => updateLoaded(orders, (list) => removeById(list, id));

  onRealtime(realtime.on<Order>('orderCreated'), place);
  onRealtime(realtime.on<Order>('orderUpdated'), place);
  onRealtime(realtime.on<Order>('orderItemAdded'), place);
  onRealtime(realtime.on<Order>('orderClosed'), place);
  onRealtime(realtime.on<{ id: string } | Order>('orderCancelled'), drop);
  onRealtime(realtime.on<{ id: string }>('orderDeleted'), drop);
  onRealtime(realtime.on<{ orderId: string; tipAmount: number }>('orderTipUpdated'), ({ orderId, tipAmount }) =>
    updateLoaded(orders, (list) => patchById(list, orderId, withTip(tipAmount))),
  );
  onRealtime(
    realtime.on<{ orderId: string; adjustments: OrderAdjustment[] }>('orderAdjustmentsUpdated'),
    ({ orderId }) => {
      const id = establishmentId();
      if (id && orders.hasValue() && orders.value()?.some((order) => order.id === orderId)) {
        void repository.getOrder(id, asOrderId(orderId)).then(place);
      }
    },
  );

  return orders;
};
