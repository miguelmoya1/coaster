import { Component, computed, debounced, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_PAGE_SIZE, oneOf, pageOf, searchOf, totalPagesOf } from '@coaster/admin';
import type {
  AdminEstablishmentSummary,
  EstablishmentBillingSource,
  EstablishmentId,
  Paginated,
} from '@coaster/common';
import { EstablishmentBillingSource as BillingSource, SubscriptionStatus } from '@coaster/common';
import type { PageResource } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CoasterInput } from '../../../components/field/input.directive';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AdminPagination } from '../../components/admin-pagination/admin-pagination';
import { BillingBadge } from '../../components/billing-badge/billing-badge';
import { StatusChip } from '../../components/status-chip/status-chip';

const BILLING_FILTERS: (EstablishmentBillingSource | undefined)[] = [
  undefined,
  BillingSource.STRIPE,
  BillingSource.MANUAL,
  BillingSource.NONE,
];

@Component({
  selector: 'coaster-admin-establishments',
  imports: [
    MatIcon,
    MatButton,
    TranslatePipe,
    Loading,
    PageHeader,
    AdminPagination,
    BillingBadge,
    StatusChip,
    CoasterInput,
  ],
  templateUrl: './admin-establishments.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminEstablishments {
  public readonly results = input.required<PageResource<Paginated<AdminEstablishmentSummary>>>();
  public readonly q = input<string>();
  public readonly billingSource = input<string>();
  public readonly status = input<string>();
  public readonly page = input<string>();

  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly #loaded = computed(() => {
    const results = this.results();
    return results.hasValue() ? results.value() : undefined;
  });

  protected readonly searchQuery = linkedSignal(() => this.q() ?? '');
  readonly #typed = debounced(this.searchQuery, 400);

  protected readonly establishments = computed(() => this.#loaded()?.items ?? []);
  protected readonly total = computed(() => this.#loaded()?.total ?? 0);
  protected readonly currentPage = computed(() => pageOf(this.page()));
  protected readonly pageSize = ADMIN_PAGE_SIZE.establishments;
  protected readonly totalPages = computed(() => totalPagesOf(this.total(), this.pageSize));
  protected readonly isLoading = computed(() => this.results().isLoading() || this.#typed.status() === 'loading');
  protected readonly hasLoaded = computed(() => this.results().hasValue());
  protected readonly selectedBillingSource = computed(() => oneOf(Object.values(BillingSource), this.billingSource()));
  protected readonly selectedStatus = computed(() => oneOf(Object.values(SubscriptionStatus), this.status()));
  protected readonly hasFilters = computed(
    () =>
      Boolean(searchOf(this.searchQuery())) ||
      this.selectedBillingSource() !== undefined ||
      this.selectedStatus() !== undefined,
  );

  protected readonly billingFilters = BILLING_FILTERS;

  constructor() {
    effect(() => {
      const typed = searchOf(this.#typed.value());

      if (typed !== searchOf(untracked(this.q))) {
        untracked(() => this.#query({ q: typed ?? null, page: null }));
      }
    });
  }

  protected onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected selectBillingSource(source: EstablishmentBillingSource | undefined) {
    this.#query({ billingSource: source ?? null, page: null });
  }

  protected filterLabel(source: EstablishmentBillingSource | undefined): string {
    return source ? `admin.billing_source.${source.toLowerCase()}` : 'admin.establishments.filter_all';
  }

  protected clearFilters() {
    this.searchQuery.set('');
    this.#query({ q: null, billingSource: null, status: null, page: null });
  }

  protected goToPage(page: number) {
    this.#query({ page: Math.min(Math.max(1, page), this.totalPages()) });
  }

  #query(queryParams: Record<string, string | number | null>) {
    void this.#router.navigate([], { relativeTo: this.#route, queryParams, queryParamsHandling: 'merge' });
  }

  protected openEstablishment(establishmentId: EstablishmentId) {
    this.#router.navigate(['/admin/establishments', establishmentId]);
  }
}
