import { inject, Service } from '@angular/core';
import { Auth, type EstablishmentId } from '@coaster/core';
import { EstablishmentRepository } from '../data-access/establishment-repository';

@Service()
export class EstablishmentSettingsService {
  readonly #establishmentRepository = inject(EstablishmentRepository);
  readonly #auth = inject(Auth);

  public execute(id: EstablishmentId | undefined) {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated() || !id) {
      return undefined;
    }

    return this.#establishmentRepository.routes.settings(id);
  }
}
