import { inject, Service } from '@angular/core';
import { Auth } from '@coaster/core';
import { EstablishmentRepository } from '../data-access/establishment-repository';

@Service()
export class MyEstablishments {
  readonly #establishmentRepository = inject(EstablishmentRepository);
  readonly #auth = inject(Auth);

  public execute() {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return undefined;
    }

    return this.#establishmentRepository.routes.myEstablishments;
  }
}
