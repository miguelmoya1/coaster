import { inject, Service } from '@angular/core';
import type { BarId, CreateShiftExchangeDto, ShiftId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Service()
export class RequestExchange {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public async execute(barId: BarId, shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    return await this.#exchangeRepository.request(barId, shiftId, dto);
  }
}
