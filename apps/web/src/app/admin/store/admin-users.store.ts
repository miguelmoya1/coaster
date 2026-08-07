import { httpResource } from '@angular/common/http';
import { computed, debounced, inject, Service, signal } from '@angular/core';
import type { Role, UpdateAdminUserDto, UserId } from '@coaster/common';
import { AdminRepository } from '../data-access/admin-repository';
import { adminUsersMapper } from '../mappers/admin.mapper';

const PAGE_SIZE = 20;

@Service()
export class AdminUsersStore {
  readonly #repository = inject(AdminRepository);

  readonly searchQuery = signal('');
  readonly role = signal<Role | undefined>(undefined);
  readonly active = signal<boolean | undefined>(undefined);
  readonly page = signal(1);

  readonly #debouncedQuery = debounced(this.searchQuery, 400);
  readonly #isSaving = signal(false);

  readonly #usersResource = httpResource(
    () =>
      this.#repository.routes.users({
        q: this.#debouncedQuery.value().trim() || undefined,
        role: this.role(),
        active: this.active(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      }),
    { parse: adminUsersMapper },
  );

  public readonly pageSize = PAGE_SIZE;
  public readonly users = computed(() => this.#usersResource.value()?.items ?? []);
  public readonly total = computed(() => this.#usersResource.value()?.total ?? 0);
  public readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  public readonly hasLoaded = computed(() => this.#usersResource.hasValue());
  public readonly isLoading = computed(
    () => this.#usersResource.isLoading() || this.#debouncedQuery.status() === 'loading',
  );
  public readonly isSaving = this.#isSaving.asReadonly();
  public readonly hasFilters = computed(
    () => Boolean(this.searchQuery().trim()) || this.role() !== undefined || this.active() !== undefined,
  );

  public setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.page.set(1);
  }

  public setRole(role: Role | undefined) {
    this.role.set(role);
    this.page.set(1);
  }

  public setActive(active: boolean | undefined) {
    this.active.set(active);
    this.page.set(1);
  }

  public goToPage(page: number) {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  public clearFilters() {
    this.searchQuery.set('');
    this.role.set(undefined);
    this.active.set(undefined);
    this.page.set(1);
  }

  public reload() {
    this.#usersResource.reload();
  }

  public async updateUser(userId: UserId, dto: UpdateAdminUserDto): Promise<void> {
    if (this.#isSaving()) {
      return;
    }

    this.#isSaving.set(true);

    try {
      await this.#repository.updateUser(userId, dto);
      this.reload();
    } finally {
      this.#isSaving.set(false);
    }
  }
}
