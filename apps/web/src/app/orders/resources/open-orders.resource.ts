import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, Order } from '@coaster/common';
import { asOrderId, OrderStatus } from '@coaster/common';
import { onRealtime, Realtime, removeById, updateLoaded, upsertById, patchById } from '@coaster/core';
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

  onRealtime(realtime.orderCreated, place);
  onRealtime(realtime.orderUpdated, place);
  onRealtime(realtime.orderItemAdded, place);
  onRealtime(realtime.orderClosed, place);
  onRealtime(realtime.orderCancelled, drop);
  onRealtime(realtime.orderDeleted, drop);
  onRealtime(realtime.orderTipUpdated, ({ orderId, tipAmount }) =>
    updateLoaded(orders, (list) => patchById(list, orderId, withTip(tipAmount))),
  );
  onRealtime(realtime.orderAdjustmentsUpdated, ({ orderId }) => {
    const id = establishmentId();
    if (id && orders.hasValue() && orders.value()?.some((order) => order.id === orderId)) {
      void repository.getOrder(id, asOrderId(orderId)).then(place);
    }
  });

  return orders;
};
