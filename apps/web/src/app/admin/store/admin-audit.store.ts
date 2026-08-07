import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { AdminAuditAction, AdminAuditTargetType } from '@coaster/common';
import { AdminRepository } from '../data-access/admin-repository';
import { adminAuditMapper } from '../mappers/admin.mapper';

const PAGE_SIZE = 25;

@Service()
export class AdminAuditStore {
  readonly #repository = inject(AdminRepository);

  readonly action = signal<AdminAuditAction | undefined>(undefined);
  readonly targetType = signal<AdminAuditTargetType | undefined>(undefined);
  readonly page = signal(1);

  readonly #auditResource = httpResource(
    () =>
      this.#repository.routes.audit({
        action: this.action(),
        targetType: this.targetType(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      }),
    { parse: adminAuditMapper },
  );

  public readonly pageSize = PAGE_SIZE;
  public readonly entries = computed(() => this.#auditResource.value()?.items ?? []);
  public readonly total = computed(() => this.#auditResource.value()?.total ?? 0);
  public readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  public readonly hasLoaded = computed(() => this.#auditResource.hasValue());
  public readonly isLoading = this.#auditResource.isLoading;
  public readonly hasFilters = computed(() => this.action() !== undefined || this.targetType() !== undefined);

  public setAction(action: AdminAuditAction | undefined) {
    this.action.set(action);
    this.page.set(1);
  }

  public setTargetType(targetType: AdminAuditTargetType | undefined) {
    this.targetType.set(targetType);
    this.page.set(1);
  }

  public goToPage(page: number) {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  public clearFilters() {
    this.action.set(undefined);
    this.targetType.set(undefined);
    this.page.set(1);
  }

  public reload() {
    this.#auditResource.reload();
  }
}
