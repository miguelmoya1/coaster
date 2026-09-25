import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { CashClose, CashClosePreview, EstablishmentId } from '@coaster/common';
import { onRealtime, Realtime } from '@coaster/core';
import { CashCloseRepository } from '../data-access/cash-close-repository';

export const cashClosePreviewResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(CashCloseRepository);
  const realtime = inject(Realtime);

  const preview = httpResource<CashClosePreview>(() => {
    const id = establishmentId();
    return id ? repository.routes.preview(id) : undefined;
  });

  for (const event of [
    realtime.orderCreated,
    realtime.orderUpdated,
    realtime.orderClosed,
    realtime.orderCancelled,
    realtime.orderDeleted,
  ]) {
    onRealtime<unknown>(event, () => preview.reload());
  }

  return preview;
};

export const cashClosesResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(CashCloseRepository);

  return httpResource<CashClose[]>(() => {
    const id = establishmentId();
    return id ? repository.routes.list(id) : undefined;
  });
};
