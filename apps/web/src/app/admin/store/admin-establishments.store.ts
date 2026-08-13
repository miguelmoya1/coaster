import { httpResource } from '@angular/common/http';
import { computed, debounced, inject, Service, signal } from '@angular/core';
import type { EstablishmentBillingSource, SubscriptionStatus } from '@coaster/common';
import { AdminRepository } from '../data-access/admin-repository';
import { adminEstablishmentsMapper } from '../mappers/admin.mapper';

const PAGE_SIZE = 20;

@Service()
export class AdminEstablishmentsStore {
  readonly #repository = inject(AdminRepository);

  readonly searchQuery = signal('');
  readonly billingSource = signal<EstablishmentBillingSource | undefined>(undefined);
  readonly status = signal<SubscriptionStatus | undefined>(undefined);
  readonly page = signal(1);

  readonly #debouncedQuery = debounced(this.searchQuery, 400);

  readonly #establishmentsResource = httpResource(
    () =>
      this.#repository.routes.establishments({
        q: this.#debouncedQuery.value().trim() || undefined,
        billingSource: this.billingSource(),
        status: this.status(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      }),
    { parse: adminEstablishmentsMapper },
  );

  public readonly pageSize = PAGE_SIZE;
  public readonly establishments = computed(() => this.#establishmentsResource.value()?.items ?? []);
  public readonly total = computed(() => this.#establishmentsResource.value()?.total ?? 0);
  public readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  public readonly hasLoaded = computed(() => this.#establishmentsResource.hasValue());
  public readonly isLoading = computed(
    () => this.#establishmentsResource.isLoading() || this.#debouncedQuery.status() === 'loading',
  );
  public readonly hasFilters = computed(
    () => Boolean(this.searchQuery().trim()) || this.billingSource() !== undefined || this.status() !== undefined,
  );

  public setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  public setBillingSource(source: EstablishmentBillingSource | undefined) {
    this.billingSource.set(source);
    this.page.set(1);
  }

  public setStatus(status: SubscriptionStatus | undefined) {
    this.status.set(status);
    this.page.set(1);
  }

  public goToPage(page: number) {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  public clearFilters() {
    this.searchQuery.set('');
    this.billingSource.set(undefined);
    this.status.set(undefined);
    this.page.set(1);
  }

  public reload() {
    this.#establishmentsResource.reload();
  }
}
