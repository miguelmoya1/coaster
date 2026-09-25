import { inject, Service } from '@angular/core';
import type { CashClose, CloseCashDto, EstablishmentId } from '@coaster/common';
import { CashCloseRepository } from '../data-access/cash-close-repository';

@Service()
export class ManageCashCloses {
  readonly #repository = inject(CashCloseRepository);

  public async close(establishmentId: EstablishmentId, dto: CloseCashDto): Promise<CashClose> {
    return this.#repository.close(establishmentId, dto);
  }
}
