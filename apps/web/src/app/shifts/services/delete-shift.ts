import { inject, Injectable } from '@angular/core';
import { BarId, ShiftId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Injectable({
  providedIn: 'root',
})
export class DeleteShift {
  readonly #shiftRepository = inject(ShiftRepository);

  public async execute(barId: BarId, shiftId: ShiftId) {
    return await this.#shiftRepository.delete(barId, shiftId);
  }
}
