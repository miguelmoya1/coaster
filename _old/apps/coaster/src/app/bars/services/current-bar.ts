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
  readonly #currentId = signal<BarId | undefined>(undefined);
  readonly #current = httpResource(
    () => {
      const currentId = this.#currentId();

      return currentId ? this.#barRepository.routes.bar(currentId) : undefined;
    },
    {
      parse: (bar) => barMapper(bar),
    },
  );

  public readonly current = this.#current.asReadonly();
  public readonly currentId = this.#currentId.asReadonly();

  public setBarContext(barId: BarId | undefined) {
    this.#currentId.set(barId);
  }

  public reload() {
    this.#current.reload();
  }
}
