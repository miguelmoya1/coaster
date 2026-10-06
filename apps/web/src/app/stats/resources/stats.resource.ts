import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentStats } from '../models/stats.interface';
import { onRealtime, Realtime, type EstablishmentId } from '@coaster/core';
import { StatsRepository } from '../data-access/stats-repository';
import type { Order } from '@coaster/orders';

export const statsResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(StatsRepository);
  const realtime = inject(Realtime);

  const stats = httpResource<EstablishmentStats>(() => {
    const id = establishmentId();
    return id ? repository.routes.get(id) : undefined;
  });

  for (const event of [
    realtime.on<Order>('orderClosed'),
    realtime.on<{ id: string } | Order>('orderCancelled'),
    realtime.on<{ id: string }>('orderDeleted'),
    realtime.reconnected,
  ]) {
    onRealtime<unknown>(event, () => stats.reload());
  }

  return stats;
};
