import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarId } from '@coaster/common';
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
import { BarMembers } from '../../../../members';
import { BarProducts } from '../../../../products';
import { BarShifts } from '../../../../shifts';

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

  readonly #productsService = inject(BarProducts);
  readonly #membersService = inject(BarMembers);
  readonly #shiftsService = inject(BarShifts);

  constructor() {
    effect(() => {
      const barId = this.barId();
      if (!barId) return;

      this.#productsService.setBarContext(barId);
      this.#membersService.setBarContext(barId);
      this.#shiftsService.setContext(barId);

      const now = new Date();
      const startIso = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      const endIso = new Date(now.setHours(23, 59, 59, 999)).toISOString();
      this.#shiftsService.setDateRange(startIso, endIso);
    });
  }

  readonly pantryAlerts = computed(() => {
    const products = this.#productsService.all.value() ?? [];
    return products
      .filter((p) => p.stockStatus === 'critical' || p.stockStatus === 'low')
      .sort((a, b) => (a.stockStatus === 'critical' && b.stockStatus !== 'critical' ? -1 : 1));
  });

  readonly activeShifts = computed(() => {
    const shifts = this.#shiftsService.all.value() ?? [];
    const now = new Date();
    return shifts.filter((s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);
      return now >= start && now <= end;
    });
  });

  readonly totalAssignedToday = computed(() => {
    return this.#shiftsService.all.value()?.length ?? 0;
  });

  readonly rosterOverview = computed(() => {
    const shifts = this.#shiftsService.all.value() ?? [];
    const members = this.#membersService.list.value() ?? [];
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
    const members = this.#membersService.list.value() ?? [];

    return [
      { label: 'dashboard.overview.bar_staff', count: members.filter((m) => m.role === 'STAFF').length },
      { label: 'dashboard.overview.floor_leads', count: 0 },
      { label: 'dashboard.overview.security', count: 0 },
    ];
  });
}

export default Dashboard;
