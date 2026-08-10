import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateShiftDto } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class CreateShift {
  readonly #shiftRepository = inject(ShiftRepository);

  public async execute(establishmentId: EstablishmentId, dto: CreateShiftDto) {
    return await this.#shiftRepository.create(establishmentId, dto);
  }
}
