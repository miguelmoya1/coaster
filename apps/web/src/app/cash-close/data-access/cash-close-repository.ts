import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { CashClose, CashCloseId, CloseCashDto } from '../models/cash-close.interface';
import type { EstablishmentId } from '@coaster/core';
import { firstValueFrom } from 'rxjs';

@Service()
export class CashCloseRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    list: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/cash-closes`,
    preview: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/cash-closes/preview`,
    void: (establishmentId: EstablishmentId, cashCloseId: CashCloseId) =>
      `/establishments/${establishmentId}/cash-closes/${cashCloseId}/void`,
  };

  public async close(establishmentId: EstablishmentId, dto: CloseCashDto): Promise<CashClose> {
    return firstValueFrom(this.#http.post<CashClose>(this.routes.list(establishmentId), dto));
  }

  public async void(establishmentId: EstablishmentId, cashCloseId: CashCloseId): Promise<CashClose> {
    return firstValueFrom(this.#http.post<CashClose>(this.routes.void(establishmentId, cashCloseId), {}));
  }
}
