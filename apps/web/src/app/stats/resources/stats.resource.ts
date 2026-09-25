import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId, EstablishmentStats } from '@coaster/common';
import { onRealtime, Realtime } from '@coaster/core';
import { StatsRepository } from '../data-access/stats-repository';

export const statsResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(StatsRepository);
  const realtime = inject(Realtime);

  const stats = httpResource<EstablishmentStats>(() => {
    const id = establishmentId();
    return id ? repository.routes.get(id) : undefined;
  });

  for (const event of [realtime.orderClosed, realtime.orderCancelled, realtime.orderDeleted]) {
    onRealtime<unknown>(event, () => stats.reload());
  }

  return stats;
};
