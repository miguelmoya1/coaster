import { inject, Service } from '@angular/core';
import { Auth } from '@coaster/core';
import { BarRepository } from '../data-access/bar-repository';

@Service()
export class MyBars {
  readonly #barRepository = inject(BarRepository);
  readonly #auth = inject(Auth);

  public execute() {
    if (!this.#auth.isAuthenticated()) {
      return undefined;
    }

    return this.#barRepository.routes.myBars;
  }
}
