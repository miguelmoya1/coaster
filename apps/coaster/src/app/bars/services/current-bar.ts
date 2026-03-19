import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { BarRepository } from '../data-access/bar-repository';
import { barMapper } from '../mappers/bar.mapper';

@Injectable({
  providedIn: 'root',
})
export class CurrentBar {
  readonly #barRepository = inject(BarRepository);

  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #current = httpResource(
    () => {
      const currentBarId = this.#currentBarId();
      return currentBarId
        ? this.#barRepository.routes.bar(currentBarId)
        : undefined;
    },
    {
      parse: barMapper,
    },
  );

  readonly currentBar = this.#current.asReadonly();

  public selectBar(barId: BarId) {
    this.#currentBarId.set(barId);
  }

  public clearBar() {
    this.#currentBarId.set(undefined);
  }

  public reload() {
    this.#current.reload();
  }
}
