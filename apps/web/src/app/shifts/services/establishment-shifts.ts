import { inject, Service } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class EstablishmentShifts {
  readonly #shiftRepository = inject(ShiftRepository);

  public execute(establishmentId: EstablishmentId | undefined, start: string | undefined, end: string | undefined) {
    if (!establishmentId || !start || !end) {
      return undefined;
    }

    return this.#shiftRepository.routes.list(establishmentId, start, end);
  }
}
