import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { CreateBarDto } from '@coaster/common';
import { barArrayMapper } from '../mappers/bar.mapper';
import { CreateBar } from '../services/create-bar';
import { MyBars } from '../services/my-bars';

@Service()
export class BarListStore {
  readonly #createBar = inject(CreateBar);
  readonly #myBars = inject(MyBars);

  readonly #myBarsResource = httpResource(() => this.#myBars.execute(), {
    parse: (bars) => barArrayMapper(bars),
  });

  public readonly list = this.#myBarsResource.asReadonly();

  public reloadMyBars() {
    this.#myBarsResource.reload();
  }

  public async create(createBarDto: CreateBarDto) {
    await this.#createBar.execute(createBarDto);
    this.reloadMyBars();
  }
}
