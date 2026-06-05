import { inject, Service } from '@angular/core';
import type { BarId, CreateShiftDto } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class CreateShift {
  readonly #shiftRepository = inject(ShiftRepository);

  public async execute(barId: BarId, dto: CreateShiftDto) {
    return await this.#shiftRepository.create(barId, dto);
  }
}
