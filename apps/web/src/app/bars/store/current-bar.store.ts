import { httpResource } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import type { BarId } from '@coaster/common';
import { barMapper } from '../mappers/bar.mapper';
import { CurrentBar } from '../services/current-bar';

@Service()
export class CurrentBarStore {
  readonly #currentBar = inject(CurrentBar);

  readonly #currentBarId = signal<BarId | undefined>(undefined);

  readonly #currentBarResource = httpResource(() => this.#currentBar.execute(this.#currentBarId()), {
    parse: (bar) => barMapper(bar),
  });

  public readonly current = this.#currentBarResource.asReadonly();
  public readonly currentId = this.#currentBarId.asReadonly();

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadCurrentBar() {
    this.#currentBarResource.reload();
  }
}
