import { inject, Service } from '@angular/core';
import type { BarId, ShiftId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class DeleteShift {
  readonly #shiftRepository = inject(ShiftRepository);

  public async execute(barId: BarId, shiftId: ShiftId) {
    return await this.#shiftRepository.delete(barId, shiftId);
  }
}
