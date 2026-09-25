import { Component, computed, input } from '@angular/core';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import type { EstablishmentStats } from '@coaster/common';
import type { PageResource } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../../../../components/loading/loading';
import { PricePipe } from '../../../../pipes/price/price';

interface Comparison {
  percent: number;
  isPositive: boolean;
  hasBaseline: boolean;
}

const compare = (current: number, baseline: number): Comparison => {
  if (baseline === 0) {
    return { percent: 0, isPositive: current >= 0, hasBaseline: false };
  }

  return {
    percent: Math.abs(Math.round(((current - baseline) / baseline) * 100)),
    isPositive: current >= baseline,
    hasBaseline: true,
  };
};

@Component({
  selector: 'coaster-today-takings-widget',
  imports: [TranslatePipe, MatIcon, MatCard, Loading, PricePipe],
  host: { class: 'block' },
  templateUrl: './today-takings-widget.html',
})
export class TodayTakingsWidget {
  public readonly stats = input.required<PageResource<EstablishmentStats>>();

  readonly value = computed(() => {
    const stats = this.stats();
    return stats.hasValue() ? stats.value() : undefined;
  });

  readonly vsYesterday = computed(() => {
    const value = this.value();
    return value ? compare(value.todayRevenue, value.yesterdayRevenue) : null;
  });

  readonly vsLastWeek = computed(() => {
    const value = this.value();
    return value ? compare(value.todayRevenue, value.sameWeekdayLastWeekRevenue) : null;
  });

  readonly weekdayName = computed(() => {
    const name = new Date().toLocaleDateString(navigator.language, { weekday: 'long' });
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}
