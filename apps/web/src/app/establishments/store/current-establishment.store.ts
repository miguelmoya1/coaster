import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { establishmentMapper } from '../mappers/establishment.mapper';
import { CurrentEstablishment } from '../services/current-establishment';

@Service()
export class CurrentEstablishmentStore {
  readonly #currentEstablishment = inject(CurrentEstablishment);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  readonly #currentEstablishmentResource = httpResource(
    () => this.#currentEstablishment.execute(this.#currentEstablishmentId()),
    {
      parse: (establishment) => establishmentMapper(establishment),
    },
  );

  public readonly current = this.#currentEstablishmentResource.asReadonly();
  public readonly currentId = this.#currentEstablishmentId.asReadonly();

  public readonly clocksInFichit = computed(
    () => this.current.hasValue() && Boolean(this.current.value()?.clocksInFichit),
  );

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public reloadCurrentEstablishment() {
    this.#currentEstablishmentResource.reload();
  }
}
