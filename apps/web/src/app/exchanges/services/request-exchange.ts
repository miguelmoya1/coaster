import { inject, Service } from '@angular/core';
import type { EstablishmentId, CreateShiftExchangeDto, ShiftId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Service()
export class RequestExchange {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public async execute(establishmentId: EstablishmentId, shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    return await this.#exchangeRepository.request(establishmentId, shiftId, dto);
  }
}
