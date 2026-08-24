import { httpResource } from '@angular/common/http';
import { computed, debounced, inject, Service, signal } from '@angular/core';
import type { AddBetaTesterDto, BetaTesterId } from '@coaster/common';
import { AdminRepository } from '../data-access/admin-repository';
import { adminBetaTestersMapper } from '../mappers/admin.mapper';

const PAGE_SIZE = 20;

@Service()
export class AdminBetaTestersStore {
  readonly #repository = inject(AdminRepository);

  readonly searchQuery = signal('');
  readonly page = signal(1);

  readonly #debouncedQuery = debounced(this.searchQuery, 400);
  readonly #isSaving = signal(false);

  readonly #testersResource = httpResource(
    () =>
      this.#repository.routes.betaTesters({
        q: this.#debouncedQuery.value().trim() || undefined,
        page: this.page(),
        pageSize: PAGE_SIZE,
      }),
    { parse: adminBetaTestersMapper },
  );

  public readonly pageSize = PAGE_SIZE;
  public readonly testers = computed(() => this.#testersResource.value()?.items ?? []);
  public readonly total = computed(() => this.#testersResource.value()?.total ?? 0);
  public readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  public readonly hasLoaded = computed(() => this.#testersResource.hasValue());
  public readonly isLoading = computed(
    () => this.#testersResource.isLoading() || this.#debouncedQuery.status() === 'loading',
  );
  public readonly isSaving = this.#isSaving.asReadonly();
  public readonly hasFilters = computed(() => Boolean(this.searchQuery().trim()));

  public setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  public goToPage(page: number) {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  public clearFilters() {
    this.searchQuery.set('');
    this.page.set(1);
  }

  public reload() {
    this.#testersResource.reload();
  }

  public async addBetaTester(dto: AddBetaTesterDto): Promise<void> {
    await this.#save(() => this.#repository.addBetaTester(dto));
  }

  public async removeBetaTester(betaTesterId: BetaTesterId): Promise<void> {
    await this.#save(() => this.#repository.removeBetaTester(betaTesterId));
  }

  async #save(action: () => Promise<void>): Promise<void> {
    if (this.#isSaving()) {
      return;
    }

    this.#isSaving.set(true);

    try {
      await action();
      this.reload();
    } finally {
      this.#isSaving.set(false);
    }
  }
}
