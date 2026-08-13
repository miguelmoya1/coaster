import { Component, computed, inject, input } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import type { EstablishmentId } from '@coaster/common';
import { StatsStore } from '@coaster/stats';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../../../../components/loading/loading';
import { PricePipe } from '../../../../pipes/price/price';

@Component({
  selector: 'coaster-revenue-history-widget',
  imports: [
    TranslatePipe,
    MatIcon,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    Loading,
    PricePipe,
  ],
  host: { class: 'block' },
  templateUrl: './revenue-history-widget.html',
})
export class RevenueHistoryWidget {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #statsStore = inject(StatsStore);

  readonly stats = this.#statsStore.stats;

  readonly history = computed(() => (this.stats.hasValue() ? (this.stats.value()?.history ?? null) : null));

  readonly currentMonthName = computed(() => {
    const monthName = new Date().toLocaleDateString(navigator.language, { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  });

  readonly previousMonthName = computed(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthName = d.toLocaleDateString(navigator.language, { month: 'long' });
    return monthName.charAt(0).toUpperCase() + monthName.slice(1);
  });

  readonly currentYear = computed(() => new Date().getFullYear());
  readonly currentMonthIndex = computed(() => new Date().getMonth());

  readonly projectedMonthRevenue = computed(() => {
    const history = this.history();
    if (!history) {
      return null;
    }

    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (dayOfMonth >= daysInMonth || history.currentMonthRevenue === 0) {
      return null;
    }

    return Math.round((history.currentMonthRevenue / dayOfMonth) * daysInMonth);
  });
}
