import { inject, Injectable } from '@angular/core';
import { BarId, CreateShiftDto } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Injectable({
  providedIn: 'root',
})
export class CreateShift {
  readonly #shiftRepository = inject(ShiftRepository);

  public async execute(barId: BarId, dto: CreateShiftDto) {
    return await this.#shiftRepository.create(barId, dto);
  }
}
