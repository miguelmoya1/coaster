import { inject, Injectable } from '@angular/core';
import { BarId, CreateShiftExchangeDto, ShiftId } from '@coaster/common';
import { ExchangeRepository } from '../data-access/exchange-repository';

@Injectable({
  providedIn: 'root',
})
export class RequestExchange {
  readonly #exchangeRepository = inject(ExchangeRepository);

  public async execute(barId: BarId, shiftId: ShiftId, dto: CreateShiftExchangeDto) {
    return await this.#exchangeRepository.request(barId, shiftId, dto);
  }
}
