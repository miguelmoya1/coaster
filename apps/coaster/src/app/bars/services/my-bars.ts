import { httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Auth } from '../../core';
import { BarRepository } from '../data-access/bar-repository';
import { barArrayMapper } from '../mappers/bar.mapper';

@Injectable({
  providedIn: 'root',
})
export class MyBars {
  readonly #barRepository = inject(BarRepository);
  readonly #auth = inject(Auth);
  readonly #all = httpResource(
    () => {
      if (!this.#auth.isAuthenticated()) {
        return undefined;
      }

      return this.#barRepository.routes.myBars;
    },
    {
      parse: barArrayMapper,
    },
  );

  public readonly all = this.#all.asReadonly();

  public reload() {
    this.#all.reload();
  }
}
