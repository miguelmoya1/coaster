import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type {
  AdminAuditQuery,
  AdminBetaTestersQuery,
  AdminEstablishmentsQuery,
  AdminUsersQuery,
  EstablishmentId,
} from '@coaster/common';
import { AdminRepository } from '../data-access/admin-repository';
import {
  adminAuditMapper,
  adminBetaTestersMapper,
  adminEstablishmentDetailMapper,
  adminEstablishmentsMapper,
  adminMetricsMapper,
  adminUsersMapper,
} from '../mappers/admin.mapper';

const RECENT_ACTIVITY_SIZE = 8;

export const ADMIN_PAGE_SIZE = { audit: 25, establishments: 20, users: 20, betaTesters: 20 } as const;

export const adminMetricsResource = () => {
  const repository = inject(AdminRepository);
  return httpResource(() => repository.routes.overview(), { parse: adminMetricsMapper });
};

export const adminRecentActivityResource = () => {
  const repository = inject(AdminRepository);
  return httpResource(() => repository.routes.audit({ page: 1, pageSize: RECENT_ACTIVITY_SIZE }), {
    parse: adminAuditMapper,
  });
};

export const adminAuditResource = (query: Signal<AdminAuditQuery>) => {
  const repository = inject(AdminRepository);
  return httpResource(() => repository.routes.audit(query()), { parse: adminAuditMapper });
};

export const adminEstablishmentsResource = (query: Signal<AdminEstablishmentsQuery>) => {
  const repository = inject(AdminRepository);
  return httpResource(() => repository.routes.establishments(query()), { parse: adminEstablishmentsMapper });
};

export const adminEstablishmentDetailResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(AdminRepository);
  return httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.establishmentDetail(id) : undefined;
    },
    { parse: adminEstablishmentDetailMapper },
  );
};

export const adminUsersResource = (query: Signal<AdminUsersQuery>) => {
  const repository = inject(AdminRepository);
  return httpResource(() => repository.routes.users(query()), { parse: adminUsersMapper });
};

export const adminBetaTestersResource = (query: Signal<AdminBetaTestersQuery>) => {
  const repository = inject(AdminRepository);
  return httpResource(() => repository.routes.betaTesters(query()), { parse: adminBetaTestersMapper });
};
