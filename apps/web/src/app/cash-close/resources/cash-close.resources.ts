import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { CashClose, CashClosePreview } from '../models/cash-close.interface';
import { onRealtime, Realtime, type EstablishmentId } from '@coaster/core';
import { CashCloseRepository } from '../data-access/cash-close-repository';
import type { Order } from '@coaster/orders';

export const cashClosePreviewResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(CashCloseRepository);
  const realtime = inject(Realtime);

  const preview = httpResource<CashClosePreview>(() => {
    const id = establishmentId();
    return id ? repository.routes.preview(id) : undefined;
  });

  for (const event of [
    realtime.on<Order>('orderCreated'),
    realtime.on<Order>('orderUpdated'),
    realtime.on<Order>('orderClosed'),
    realtime.on<{ id: string } | Order>('orderCancelled'),
    realtime.on<{ id: string }>('orderDeleted'),
    realtime.reconnected,
  ]) {
    onRealtime<unknown>(event, () => preview.reload());
  }

  return preview;
};

export const cashClosesResource = (establishmentId: Signal<EstablishmentId | undefined>, date: Signal<string>) => {
  const repository = inject(CashCloseRepository);

  return httpResource<CashClose[]>(() => {
    const id = establishmentId();
    return id ? { url: repository.routes.list(id), params: { date: date() } } : undefined;
  });
};
