import { inject, Service } from '@angular/core';
import type { CreateShiftExchangeDto, EstablishmentId, ShiftExchangeId, ShiftId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Service()
export class ManageExchanges {
  readonly #repository = inject(ExchangeRepository);

  public async request(establishmentId: EstablishmentId, shiftId: ShiftId, dto: CreateShiftExchangeDto): Promise<void> {
    await this.#repository.request(establishmentId, shiftId, dto);
  }

  public async accept(establishmentId: EstablishmentId, exchangeId: ShiftExchangeId): Promise<void> {
    await this.#repository.accept(establishmentId, exchangeId);
  }

  public async delete(establishmentId: EstablishmentId, exchangeId: ShiftExchangeId): Promise<void> {
    await this.#repository.delete(establishmentId, exchangeId);
  }
}
