import { httpResource } from '@angular/common/http';
import { computed, debounced, inject, Service, signal } from '@angular/core';
import { barArrayMapper } from '../mappers/bar.mapper';
import { AdminSearchBars } from '../services/admin-search-bars';

@Service()
export class AdminBarsStore {
  readonly #adminSearchBars = inject(AdminSearchBars);

  readonly searchQuery = signal('');
  readonly debouncedQuery = debounced(this.searchQuery, 400);

  readonly searchResource = httpResource(
    () => {
      return this.#adminSearchBars.execute(this.debouncedQuery.value());
    },
    {
      parse: (bars) => barArrayMapper(bars),
    },
  );

  readonly searchResults = computed(() => this.searchResource.value() ?? null);
  readonly isSearching = computed(() => this.searchResource.isLoading() || this.debouncedQuery.status() === 'loading');

  public clearSearch() {
    this.searchQuery.set('');
  }
}
