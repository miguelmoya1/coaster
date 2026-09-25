import { httpResource } from '@angular/common/http';
import { effect, inject, Service, signal, untracked } from '@angular/core';
import type { CashClose, CashClosePreview, CloseCashDto, EstablishmentId } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { CashCloseRepository } from '../data-access/cash-close-repository';

@Service()
export class CashCloseStore {
  readonly #repository = inject(CashCloseRepository);
  readonly #realtime = inject(Realtime);

  readonly #establishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #preview = httpResource<CashClosePreview>(() => {
    const establishmentId = this.#establishmentId();
    return establishmentId ? this.#repository.routes.preview(establishmentId) : undefined;
  });

  readonly #history = httpResource<CashClose[]>(() => {
    const establishmentId = this.#establishmentId();
    return establishmentId ? this.#repository.routes.list(establishmentId) : undefined;
  });

  public readonly preview = this.#preview.asReadonly();
  public readonly history = this.#history.asReadonly();

  constructor() {
    effect(() => {
      const changes = [
        this.#realtime.orderCreated(),
        this.#realtime.orderUpdated(),
        this.#realtime.orderClosed(),
        this.#realtime.orderCancelled(),
        this.#realtime.orderDeleted(),
      ];

      if (changes.some(Boolean)) {
        untracked(() => this.#preview.reload());
      }
    });
  }

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#establishmentId.set(establishmentId);
  }

  public async close(establishmentId: EstablishmentId, dto: CloseCashDto): Promise<CashClose> {
    const cashClose = await this.#repository.close(establishmentId, dto);
    this.#preview.reload();
    this.#history.reload();
    return cashClose;
  }
}
