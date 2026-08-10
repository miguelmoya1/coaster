import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type {
  EstablishmentId,
  EstablishmentMemberId,
  EstablishmentRole,
  GrantEstablishmentPlanDto,
  RevokeEstablishmentPlanDto,
} from '@coaster/common';
import { UpdateMemberRole } from '@coaster/establishment-members';
import { AdminRepository } from '../data-access/admin-repository';
import { adminEstablishmentDetailMapper } from '../mappers/admin.mapper';

@Service()
export class AdminEstablishmentDetailStore {
  readonly #repository = inject(AdminRepository);
  readonly #updateMemberRole = inject(UpdateMemberRole);
  readonly #establishmentId = signal<EstablishmentId | undefined>(undefined);
  readonly #isSaving = signal(false);

  readonly #detailResource = httpResource(
    () => {
      const establishmentId = this.#establishmentId();
      return establishmentId ? this.#repository.routes.establishmentDetail(establishmentId) : undefined;
    },
    { parse: adminEstablishmentDetailMapper },
  );

  public readonly detail = computed(() => this.#detailResource.value() ?? null);
  public readonly establishment = computed(() => this.detail()?.establishment ?? null);
  public readonly subscription = computed(() => this.detail()?.subscription ?? null);
  public readonly members = computed(() => this.detail()?.members ?? []);
  public readonly counters = computed(() => this.detail()?.counters ?? null);
  public readonly recentActivity = computed(() => this.detail()?.recentActivity ?? []);
  public readonly isLoading = this.#detailResource.isLoading;
  public readonly error = this.#detailResource.error;
  public readonly isSaving = this.#isSaving.asReadonly();

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#establishmentId.set(establishmentId);
  }

  public reload() {
    this.#detailResource.reload();
  }

  public grantPlan(dto: GrantEstablishmentPlanDto) {
    return this.#mutate((establishmentId) => this.#repository.grantEstablishmentPlan(establishmentId, dto));
  }

  public revokePlan(dto: RevokeEstablishmentPlanDto) {
    return this.#mutate((establishmentId) => this.#repository.revokeEstablishmentPlan(establishmentId, dto));
  }

  public rename(name: string) {
    return this.#mutate((establishmentId) => this.#repository.renameEstablishment(establishmentId, { name }));
  }

  public updateMemberRole(memberId: EstablishmentMemberId, role: EstablishmentRole) {
    return this.#mutate((establishmentId) => this.#updateMemberRole.execute(establishmentId, memberId, role));
  }

  async #mutate(action: (establishmentId: EstablishmentId) => Promise<void>): Promise<void> {
    const establishmentId = this.#establishmentId();

    if (!establishmentId || this.#isSaving()) {
      return;
    }

    this.#isSaving.set(true);

    try {
      await action(establishmentId);
      this.reload();
    } finally {
      this.#isSaving.set(false);
    }
  }
}
