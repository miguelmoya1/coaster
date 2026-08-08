import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AdminAuditQuery,
  AdminBarsQuery,
  AdminUsersQuery,
  BarId,
  GrantBarPlanDto,
  RenameBarDto,
  RevokeBarPlanDto,
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
    bars: (query: AdminBarsQuery) => `/admin/bars${toQueryString({ ...query })}`,
    barDetail: (barId: BarId) => `/admin/bars/${barId}`,
    barPlan: (barId: BarId) => `/admin/bars/${barId}/plan`,
    revokeBarPlan: (barId: BarId) => `/admin/bars/${barId}/plan/revoke`,
    users: (query: AdminUsersQuery) => `/admin/users${toQueryString({ ...query })}`,
    userDetail: (userId: UserId) => `/admin/users/${userId}`,
  };

  public async grantBarPlan(barId: BarId, dto: GrantBarPlanDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.barPlan(barId), dto));
  }

  public async revokeBarPlan(barId: BarId, dto: RevokeBarPlanDto): Promise<void> {
    await firstValueFrom(this.#http.post<void>(this.routes.revokeBarPlan(barId), dto));
  }

  public async renameBar(barId: BarId, dto: RenameBarDto): Promise<void> {
    await firstValueFrom(this.#http.patch<void>(this.routes.barDetail(barId), dto));
  }


  public async updateUser(userId: UserId, dto: UpdateAdminUserDto): Promise<void> {
    await firstValueFrom(this.#http.patch<void>(this.routes.userDetail(userId), dto));
  }
}
