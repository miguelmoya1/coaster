import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  CreateEstablishmentDto,
  EstablishmentId,
  EstablishmentSettings,
  UpdateEstablishmentSettingsDto,
} from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class EstablishmentRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    myEstablishments: '/establishments',
    establishment: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}`,
    settings: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/settings`,
    create: '/establishments',
  };

  public async create(createEstablishmentDto: CreateEstablishmentDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.create, createEstablishmentDto));
  }

  public updateSettings(
    establishmentId: EstablishmentId,
    dto: UpdateEstablishmentSettingsDto,
  ): Promise<EstablishmentSettings> {
    return firstValueFrom(this.#http.patch<EstablishmentSettings>(this.routes.settings(establishmentId), dto));
  }
}
