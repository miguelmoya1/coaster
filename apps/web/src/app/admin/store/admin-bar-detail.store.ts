import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type { BarId, BarRole, GrantBarPlanDto, RevokeBarPlanDto, UserId } from '@coaster/common';
import { AdminRepository } from '../data-access/admin-repository';
import { adminBarDetailMapper } from '../mappers/admin.mapper';

@Service()
export class AdminBarDetailStore {
  readonly #repository = inject(AdminRepository);
  readonly #barId = signal<BarId | undefined>(undefined);
  readonly #isSaving = signal(false);

  readonly #detailResource = httpResource(
    () => {
      const barId = this.#barId();
      return barId ? this.#repository.routes.barDetail(barId) : undefined;
    },
    { parse: adminBarDetailMapper },
  );

  public readonly detail = computed(() => this.#detailResource.value() ?? null);
  public readonly bar = computed(() => this.detail()?.bar ?? null);
  public readonly subscription = computed(() => this.detail()?.subscription ?? null);
  public readonly members = computed(() => this.detail()?.members ?? []);
  public readonly counters = computed(() => this.detail()?.counters ?? null);
  public readonly recentActivity = computed(() => this.detail()?.recentActivity ?? []);
  public readonly isLoading = this.#detailResource.isLoading;
  public readonly error = this.#detailResource.error;
  public readonly isSaving = this.#isSaving.asReadonly();

  public setBarId(barId: BarId | undefined) {
    this.#barId.set(barId);
  }

  public reload() {
    this.#detailResource.reload();
  }

  public grantPlan(dto: GrantBarPlanDto) {
    return this.#mutate((barId) => this.#repository.grantBarPlan(barId, dto));
  }

  public revokePlan(dto: RevokeBarPlanDto) {
    return this.#mutate((barId) => this.#repository.revokeBarPlan(barId, dto));
  }

  public rename(name: string) {
    return this.#mutate((barId) => this.#repository.renameBar(barId, { name }));
  }

  public updateMemberRole(userId: UserId, role: BarRole) {
    return this.#mutate((barId) => this.#repository.updateBarMemberRole(barId, userId, role));
  }

  async #mutate(action: (barId: BarId) => Promise<void>): Promise<void> {
    const barId = this.#barId();

    if (!barId || this.#isSaving()) {
      return;
    }

    this.#isSaving.set(true);

    try {
      await action(barId);
      this.reload();
    } finally {
      this.#isSaving.set(false);
    }
  }
}
