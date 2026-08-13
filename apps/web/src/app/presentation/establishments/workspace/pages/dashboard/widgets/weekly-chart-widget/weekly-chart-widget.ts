import { Component, computed, inject, input } from '@angular/core';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import type { EstablishmentId } from '@coaster/common';
import { StatsStore } from '@coaster/stats';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../../../../components/loading/loading';
import { PricePipe } from '../../../../pipes/price/price';

@Component({
  selector: 'coaster-weekly-chart-widget',
  imports: [TranslatePipe, MatIcon, MatCard, MatCardContent, MatCardHeader, Loading, PricePipe],
  host: { class: 'block' },
  templateUrl: './weekly-chart-widget.html',
})
export class WeeklyChartWidget {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #statsStore = inject(StatsStore);

  readonly stats = this.#statsStore.stats;

  readonly chartPaths = computed(() => {
    if (!this.stats.hasValue()) {
      return { linePath: '', areaPath: '', points: [] };
    }
    const statsData = this.stats.value();
    if (!statsData) {
      return { linePath: '', areaPath: '', points: [] };
    }

    const revenues = statsData.dailyRevenues;
    const max = Math.max(...revenues.map((r) => r.amount), 1);

    if (revenues.length === 0) {
      return { linePath: '', areaPath: '', points: [] };
    }

    const points = revenues.map((r, i) => {
      const x = 25 + i * 55;
      const y = 90 - (r.amount / max) * 70;
      return {
        x,
        y,
        xPct: (x / 380) * 100,
        yPct: (y / 110) * 100,
        amount: r.amount,
        dayName: r.dayName,
        isFirst: i === 0,
        isLast: i === revenues.length - 1,
      };
    });

    const firstPt = points[0];
    const lastPt = points[points.length - 1];

    const linePath = `M 0,${firstPt.y} L ` + points.map((p) => `${p.x},${p.y}`).join(' L ') + ` L 380,${lastPt.y}`;
    const areaPath = `${linePath} L 380,100 L 0,100 Z`;

    return { linePath, areaPath, points };
  });
}
