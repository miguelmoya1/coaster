import { httpResource } from '@angular/common/http';
import { computed, debounced, inject, Service, signal } from '@angular/core';
import { BarRepository } from '../data-access/bar-repository';
import { barArrayMapper } from '../mappers/bar.mapper';

@Service()
export class AdminBarsStore {
  readonly #barRepository = inject(BarRepository);

  readonly searchQuery = signal('');
  readonly debouncedQuery = debounced(this.searchQuery, 400);

  readonly searchResource = httpResource(() => {
    const q = this.debouncedQuery.value();
    if (!q || !q.trim()) return undefined;
    return this.#barRepository.routes.adminSearch(q.trim());
  }, {
    parse: barArrayMapper,
  });

  readonly searchResults = computed(() => this.searchResource.value() ?? null);
  readonly isSearching = computed(() => this.searchResource.isLoading() || this.debouncedQuery.status() === 'loading');

  public clearSearch() {
    this.searchQuery.set('');
  }
}
