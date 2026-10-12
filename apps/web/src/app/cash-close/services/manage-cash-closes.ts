import { inject, Service } from '@angular/core';
import type { CashClose, CashCloseId, CloseCashDto } from '../models/cash-close.interface';
import type { EstablishmentId } from '@coaster/core';
import { CashCloseRepository } from '../data-access/cash-close-repository';

@Service()
export class ManageCashCloses {
  readonly #repository = inject(CashCloseRepository);

  public async close(establishmentId: EstablishmentId, dto: CloseCashDto): Promise<CashClose> {
    return this.#repository.close(establishmentId, dto);
  }

  public async void(establishmentId: EstablishmentId, cashCloseId: CashCloseId): Promise<CashClose> {
    return this.#repository.void(establishmentId, cashCloseId);
  }
}
