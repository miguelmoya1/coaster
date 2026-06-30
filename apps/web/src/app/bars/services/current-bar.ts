import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class CurrentBar {
  readonly #barRepository = inject(BarRepository);
  readonly #auth = inject(Auth);

  public execute(id: BarId | undefined) {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated()) {
      return undefined;
    }

    if (!id) {
      return undefined;
    }

    return this.#barRepository.routes.bar(id);
  }
}
