import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId, CreateBarDto } from '@coaster/common';
import { handleErrorFormField } from '../../core';
import { barArrayMapper, barMapper } from '../mappers/bar.mapper';
import { CreateBar } from '../services/create-bar';
import { CurrentBar } from '../services/current-bar';
import { MyBars } from '../services/my-bars';

@Injectable({
  providedIn: 'root',
})
export class BarsStore {
  readonly #createBar = inject(CreateBar);
  readonly #myBars = inject(MyBars);
  readonly #currentBar = inject(CurrentBar);
  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #myBarsResource = httpResource(() => this.#myBars.execute(), {
    parse: (bars) => barArrayMapper(bars),
  });
  readonly #currentBarResource = httpResource(() => this.#currentBar.execute(this.#currentBarId()), {
    parse: (bar) => barMapper(bar),
  });

  public readonly list = this.#myBarsResource.asReadonly();
  public readonly current = this.#currentBarResource.asReadonly();
  public readonly currentId = this.#currentBarId.asReadonly();

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public reloadCurrentBar() {
    this.#currentBarResource.reload();
  }

  public reloadMyBars() {
    this.#myBarsResource.reload();
  }

  public async create(createBarDto: CreateBarDto) {
    try {
      const bar = await this.#createBar.execute(createBarDto);

      if (!this.#myBarsResource.hasValue()) {
        this.#myBarsResource.set([bar]);
        return null;
      }

      const myBars = this.#myBarsResource.value();

      if (!myBars) {
        this.#myBarsResource.set([bar]);
        return null;
      }

      this.#myBarsResource.update((bars) => [...bars, bar]);
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
