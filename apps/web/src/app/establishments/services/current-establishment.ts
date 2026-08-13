import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { EstablishmentRepository } from '../data-access/establishment-repository';

@Service()
export class CurrentEstablishment {
  readonly #establishmentRepository = inject(EstablishmentRepository);
  readonly #auth = inject(Auth);

  public execute(id: EstablishmentId | undefined) {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return undefined;
    }

    if (!id) {
      return undefined;
    }

    return this.#establishmentRepository.routes.establishment(id);
  }
}
