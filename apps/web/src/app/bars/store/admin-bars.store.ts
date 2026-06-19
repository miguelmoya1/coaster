import { computed, debounced, inject, resource, Service, signal } from '@angular/core';
import { SearchAdminBars } from '../services/search-admin-bars';

@Service()
export class AdminBarsStore {
  readonly #searchAdminBars = inject(SearchAdminBars);

  readonly searchQuery = signal('');
  readonly debouncedQuery = debounced(this.searchQuery, 400);

  readonly searchResource = resource({
    params: () => this.debouncedQuery.value(),
    loader: async ({ params }) => {
      if (!params || !params.trim()) return null;
      return await this.#searchAdminBars.execute(params.trim());
    },
  });

  readonly searchResults = computed(() => this.searchResource.value() ?? null);
  readonly isSearching = computed(() => this.searchResource.isLoading() || this.debouncedQuery.status() === 'loading');

  public clearSearch() {
    this.searchQuery.set('');
  }
}
