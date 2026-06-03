import { inject, Injectable } from '@angular/core';
import type { BarId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { BarRepository } from '../data-access/bar-repository';

@Injectable({
  providedIn: 'root',
})
export class CurrentBar {
  readonly #barRepository = inject(BarRepository);
  readonly #auth = inject(Auth);

  public execute(id: BarId | undefined) {
    if (!this.#auth.isAuthenticated()) {
      return undefined;
    }

    if (!id) {
      return undefined;
    }

    return this.#barRepository.routes.bar(id);
  }
}
