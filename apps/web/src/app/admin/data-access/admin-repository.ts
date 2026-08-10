import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AdminAuditQuery,
  AdminEstablishmentsQuery,
  AdminUsersQuery,
  EstablishmentId,
  GrantEstablishmentPlanDto,
  RenameEstablishmentDto,
  RevokeEstablishmentPlanDto,
  UpdateAdminUserDto,
  UserId,
} from '@coaster/common';
import { firstValueFrom } from 'rxjs';

const toQueryString = (params: Record<string, string | number | boolean | undefined>): string => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : '';
};

@Service()
export class AdminRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    overview: () => '/admin/overview',
    audit: (query: AdminAuditQuery) => `/admin/audit${toQueryString({ ...query })}`,
    establishments: (query: AdminEstablishmentsQuery) => `/admin/establishments${toQueryString({ ...query })}`,
    establishmentDetail: (establishmentId: EstablishmentId) => `/admin/establishments/${establishmentId}`,
    establishmentPlan: (establishmentId: EstablishmentId) => `/admin/establishments/${establishmentId}/plan`,
    revokeEstablishmentPlan: (establishmentId: EstablishmentId) =>
      `/admin/establishments/${establishmentId}/plan/revoke`,
    users: (query: AdminUsersQuery) => `/admin/users${toQueryString({ ...query })}`,
    userDetail: (userId: UserId) => `/admin/users/${userId}`,
  };

  public async grantEstablishmentPlan(establishmentId: EstablishmentId, dto: GrantEstablishmentPlanDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.establishmentPlan(establishmentId), dto));
  }

  public async revokeEstablishmentPlan(
    establishmentId: EstablishmentId,
    dto: RevokeEstablishmentPlanDto,
  ): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.revokeEstablishmentPlan(establishmentId), dto));
  }

  public async renameEstablishment(establishmentId: EstablishmentId, dto: RenameEstablishmentDto): Promise<void> {
    await firstValueFrom(this.#http.patch<void>(this.routes.establishmentDetail(establishmentId), dto));
  }

  public async updateUser(userId: UserId, dto: UpdateAdminUserDto): Promise<void> {
    await firstValueFrom(this.#http.patch<void>(this.routes.userDetail(userId), dto));
  }
}
