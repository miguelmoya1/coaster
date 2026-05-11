import { inject, Injectable } from '@angular/core';
import { Auth } from '../../core';
import { BarRepository } from '../data-access/bar-repository';

@Injectable({
  providedIn: 'root',
})
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
