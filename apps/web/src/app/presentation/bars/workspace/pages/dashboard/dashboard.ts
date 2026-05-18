import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarId } from '@coaster/common';
import { MembersStore } from '@coaster/members';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideAlertTriangle,
  lucideArrowRight,
  lucideCheckCircle2,
  lucideChevronRight,
  lucidePlus,
  lucideUsers,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-dashboard',
  imports: [DecimalPipe, TranslatePipe, NgIcon, RouterLink],
  templateUrl: './dashboard.html',
  viewProviders: [
    provideIcons({
      lucideAlertCircle,
      lucideAlertTriangle,
      lucideCheckCircle2,
      lucideChevronRight,
      lucideUsers,
      lucidePlus,
      lucideArrowRight,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  public readonly barId = input.required<BarId>();

  readonly #productsStore = inject(ProductsStore);
  readonly #membersStore = inject(MembersStore);
  readonly #shiftsStore = inject(ShiftsStore);

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
      .filter((p) => p.stockStatus === 'critical' || p.stockStatus === 'low')
      .sort((a, b) => (a.stockStatus === 'critical' && b.stockStatus !== 'critical' ? -1 : 1));
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
}

export default Dashboard;
