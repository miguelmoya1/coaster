import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class BarShifts {
  readonly #shiftRepository = inject(ShiftRepository);

  public execute(barId: BarId | undefined, start: string | undefined, end: string | undefined) {
    if (!barId || !start || !end) {
      return undefined;
    }

    return this.#shiftRepository.routes.list(barId, start, end);
  }
}
