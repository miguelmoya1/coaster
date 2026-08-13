import { inject, Service } from '@angular/core';
import type { EstablishmentId, ShiftId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class DeleteShift {
  readonly #shiftRepository = inject(ShiftRepository);

  public async execute(establishmentId: EstablishmentId, shiftId: ShiftId) {
    return await this.#shiftRepository.delete(establishmentId, shiftId);
  }
}
