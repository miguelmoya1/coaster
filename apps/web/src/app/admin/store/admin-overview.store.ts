import { httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { AdminRepository } from '../data-access/admin-repository';
import { adminAuditMapper, adminMetricsMapper } from '../mappers/admin.mapper';

const RECENT_ACTIVITY_SIZE = 8;

@Service()
export class AdminOverviewStore {
  readonly #repository = inject(AdminRepository);

  readonly #metricsResource = httpResource(() => this.#repository.routes.overview(), { parse: adminMetricsMapper });

  readonly #recentActivityResource = httpResource(
    () => this.#repository.routes.audit({ page: 1, pageSize: RECENT_ACTIVITY_SIZE }),
    { parse: adminAuditMapper },
  );

  public readonly metrics = computed(() => this.#metricsResource.value() ?? null);
  public readonly recentActivity = computed(() => this.#recentActivityResource.value()?.items ?? []);
  public readonly isLoading = computed(
    () => this.#metricsResource.isLoading() || this.#recentActivityResource.isLoading(),
  );
  public readonly error = this.#metricsResource.error;

  public reload() {
    this.#metricsResource.reload();
    this.#recentActivityResource.reload();
  }
}
