import { inject, Service } from '@angular/core';
import type { CreateShiftDto, EstablishmentId, Shift, ShiftId } from '@coaster/common';
import { ShiftRepository } from '../data-access/shift-repository';

@Service()
export class ManageShifts {
  readonly #repository = inject(ShiftRepository);

  public async listBetween(establishmentId: EstablishmentId, startIso: string, endIso: string): Promise<Shift[]> {
    return this.#repository.listBetween(establishmentId, startIso, endIso);
  }

  public async create(establishmentId: EstablishmentId, dto: CreateShiftDto): Promise<void> {
    await this.#repository.create(establishmentId, dto);
  }

  public async delete(establishmentId: EstablishmentId, shiftId: ShiftId): Promise<void> {
    await this.#repository.delete(establishmentId, shiftId);
  }
}
