import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { SubscriptionStatus } from '@coaster/common';
import { AdminOverviewStore } from '@coaster/admin';
import { TranslatePipe } from '@ngx-translate/core';
import { PricePipe } from '../../../establishments/workspace/pipes/price/price';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AuditList } from '../../components/audit-list/audit-list';

@Component({
  selector: 'coaster-admin-overview',
  imports: [MatIcon, MatButton, RouterLink, TranslatePipe, PricePipe, Loading, PageHeader, AuditList],
  templateUrl: './admin-overview.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminOverview {
  readonly #store = inject(AdminOverviewStore);

  protected readonly metrics = this.#store.metrics;
  protected readonly recentActivity = this.#store.recentActivity;
  protected readonly isLoading = this.#store.isLoading;

  protected readonly statusBreakdown = computed(() => {
    const byStatus = this.metrics()?.subscriptions.byStatus;

    if (!byStatus) {
      return [];
    }

    return Object.values(SubscriptionStatus)
      .map((status) => ({ status, count: byStatus[status] ?? 0 }))
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.count - a.count);
  });

  protected readonly withoutAccess = computed(() => {
    const metrics = this.metrics();
    return metrics ? Math.max(0, metrics.establishments.total - metrics.subscriptions.withAccess) : 0;
  });

  protected reload() {
    this.#store.reload();
  }
}
