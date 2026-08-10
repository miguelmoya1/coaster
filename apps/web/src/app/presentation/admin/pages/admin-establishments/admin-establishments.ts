import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminEstablishmentsStore } from '@coaster/admin';
import type { EstablishmentBillingSource, EstablishmentId } from '@coaster/common';
import { EstablishmentBillingSource as BillingSource } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
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
    MatFormField,
    MatLabel,
    MatSuffix,
    MatInput,
    TranslatePipe,
    Loading,
    PageHeader,
    AdminPagination,
    BillingBadge,
    StatusChip,
  ],
  templateUrl: './admin-establishments.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminEstablishments {
  readonly #store = inject(AdminEstablishmentsStore);
  readonly #router = inject(Router);

  protected readonly establishments = this.#store.establishments;
  protected readonly total = this.#store.total;
  protected readonly page = this.#store.page;
  protected readonly pageSize = this.#store.pageSize;
  protected readonly totalPages = this.#store.totalPages;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly hasLoaded = this.#store.hasLoaded;
  protected readonly hasFilters = this.#store.hasFilters;
  protected readonly searchQuery = this.#store.searchQuery;
  protected readonly billingSource = this.#store.billingSource;

  protected readonly billingFilters = BILLING_FILTERS;

  constructor() {
    const requested = inject(ActivatedRoute).snapshot.queryParamMap.get('billingSource');

    if (requested && BILLING_FILTERS.includes(requested as EstablishmentBillingSource)) {
      this.#store.setBillingSource(requested as EstablishmentBillingSource);
    }
  }

  protected onSearch(event: Event) {
    this.#store.setSearchQuery((event.target as HTMLInputElement).value);
  }

  protected selectBillingSource(source: EstablishmentBillingSource | undefined) {
    this.#store.setBillingSource(source);
  }

  protected filterLabel(source: EstablishmentBillingSource | undefined): string {
    return source ? `admin.billing_source.${source.toLowerCase()}` : 'admin.establishments.filter_all';
  }

  protected clearFilters() {
    this.#store.clearFilters();
  }

  protected goToPage(page: number) {
    this.#store.goToPage(page);
  }

  protected openEstablishment(establishmentId: EstablishmentId) {
    this.#router.navigate(['/admin/establishments', establishmentId]);
  }
}
