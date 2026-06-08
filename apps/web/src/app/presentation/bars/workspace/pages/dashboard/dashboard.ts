import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { BarId } from '@coaster/common';
import { MembersStore } from '@coaster/members';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { StatsStore } from '@coaster/stats';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardSubtitle } from '@angular/material/card';
import { InventoryItemCard } from '../../components/inventory-item-card/inventory-item-card';
import { PricePipe } from '../../pipes/price/price';
import { Loading } from '../../../../components/loading/loading';

@Component({
  selector: 'coaster-dashboard',
  imports: [TranslatePipe, MatIcon, RouterLink, InventoryItemCard, PricePipe, Loading, MatCard, MatCardContent, MatCardHeader, MatCardTitle, MatCardSubtitle],
  templateUrl: './dashboard.html',
  })
export class Dashboard {
  public readonly barId = input.required<BarId>();

  readonly #productsStore = inject(ProductsStore);
  readonly #membersStore = inject(MembersStore);
  readonly #shiftsStore = inject(ShiftsStore);
  readonly #statsStore = inject(StatsStore);

  public readonly stats = this.#statsStore.stats;

  constructor() {
    effect(() => {
      const now = new Date();
      const startIso = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endIso = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      this.#shiftsStore.setDateRange(startIso, endIso);
    });

    effect(() => {
      const barId = this.barId();

      this.#membersStore.setBarId(barId);
      this.#productsStore.setBarId(barId);
      this.#shiftsStore.setBarId(barId);
      this.#statsStore.setBarId(barId);
    });
  }

  readonly pantryAlerts = computed(() => {
    if (!this.#productsStore.list.hasValue()) {
      return [];
    }

    const products = this.#productsStore.list.value();

    if (!products) {
      return [];
    }

    return products
      .filter((p) => p.stockStatus === 'ALERT' || p.stockStatus === 'WARNING')
      .sort((a, b) => (a.stockStatus === 'ALERT' && b.stockStatus !== 'ALERT' ? -1 : 1));
  });

  readonly pantryAlertsSliced = computed(() => {
    return this.pantryAlerts().slice(0, 3);
  });

  readonly hasMorePantryAlerts = computed(() => {
    return this.pantryAlerts().length > 3;
  });

  readonly morePantryAlertsCount = computed(() => {
    return Math.max(0, this.pantryAlerts().length - 3);
  });

  readonly activeShifts = computed(() => {
    if (!this.#shiftsStore.shifts.hasValue()) {
      return [];
    }

    const shifts = this.#shiftsStore.shifts.value();
    const now = new Date();
    return shifts.filter((s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      return now >= start && now <= end;
    });
  });

  readonly totalAssignedToday = computed(() => {
    if (!this.#shiftsStore.shifts.hasValue()) {
      return 0;
    }
    return this.#shiftsStore.shifts.value()?.length ?? 0;
  });

  readonly rosterOverview = computed(() => {
    if (!this.#membersStore.list.hasValue() || !this.#shiftsStore.shifts.hasValue()) {
      return [];
    }

    const shifts = this.#shiftsStore.shifts.value();
    const members = this.#membersStore.list.value();

    if (!shifts || !members) {
      return [];
    }

    const now = new Date();

    return shifts
      .map((s) => {
        const member = members.find((m) => m.userId === s.userId);
        if (!member) return null;

        const start = new Date(s.startTime);
        const end = new Date(s.endTime);

        if (now > end) return null;

        const isCurrent = now >= start && now <= end;

        const formatTime = (date: Date) =>
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

        return {
          id: s.id,
          userName: member.userName,
          userImage: member.userImage,
          roleLabel: member.role === 'OWNER' ? 'Owner' : 'Staff Member',
          timeRange: `${formatTime(start)} — ${formatTime(end)}`,
          status: isCurrent ? 'current' : 'next',
          startTime: start.getTime(),
        };
      })
      .filter((s) => !!s)
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 3);
  });

  readonly overviewStats = computed(() => {
    if (!this.#membersStore.list.hasValue()) {
      return [];
    }

    const members = this.#membersStore.list.value();

    if (!members) {
      return [];
    }

    return [
      { label: 'dashboard.overview.bar_staff', count: members.filter((m) => m.role === 'STAFF').length },
      { label: 'dashboard.overview.floor_leads', count: 0 },
      { label: 'dashboard.overview.security', count: 0 },
    ];
  });

  readonly chartPaths = computed(() => {
    if (!this.stats.hasValue()) {
      return { linePath: '', areaPath: '', points: [] };
    }
    const statsData = this.stats.value();
    if (!statsData) {
      return { linePath: '', areaPath: '', points: [] };
    }

    const revenues = statsData.dailyRevenues;
    const max = statsData.maxMonthRevenue || Math.max(...revenues.map((r) => r.amount), 1);

    if (revenues.length === 0) {
      return { linePath: '', areaPath: '', points: [] };
    }

    const points = revenues.map((r, i) => {
      const x = 25 + i * 58;
      const y = 90 - (r.amount / max) * 70;
      return { x, y, amount: r.amount, dayName: r.dayName };
    });

    const linePath = 'M ' + points.map((p) => `${p.x},${p.y}`).join(' L ');
    const areaPath = `${linePath} L ${points[points.length - 1].x},100 L ${points[0].x},100 Z`;

    return {
      linePath,
      areaPath,
      points,
    };
  });

  readonly currentMonthName = computed(() => {
    const now = new Date();
    const monthName = now.toLocaleDateString(navigator.language, { month: 'long' });
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
}

export default Dashboard;
