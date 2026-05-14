import { inject, Injectable } from '@angular/core';
import { BarId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Injectable({
  providedIn: 'root',
})
export class BarShifts {
  readonly #shiftRepository = inject(ShiftRepository);

  public execute(barId: BarId | undefined, start: string | undefined, end: string | undefined) {
    if (!barId || !start || !end) {
      return undefined;
    }

    return this.#shiftRepository.routes.list(barId, start, end);
  }
}
