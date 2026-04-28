import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarId } from '@coaster/interfaces';
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
  template: `
    <div class="p-6 max-w-2xl mx-auto flex flex-col gap-10">
      <section class="flex flex-col gap-4">
        <header class="flex justify-between items-end">
          <h2 class="text-primary font-bold tracking-tight text-lg">
            {{ 'dashboard.sections.pantry' | translate }}
          </h2>
          <span class="text-on-surface-variant text-xxs-plus font-bold tracking-widest uppercase">
            {{ 'dashboard.sections.pantry_issues' | translate: { count: pantryAlerts().length } }}
          </span>
        </header>

        <div class="flex flex-col gap-3">
          @for (product of pantryAlerts(); track product.id) {
            <div
              class="bg-surface-container rounded-2xl p-5 border-l-4 flex justify-between items-center shadow-lg transition-transform active:scale-[0.98]"
              [class.border-error]="product.stockStatus === 'critical'"
              [class.border-secondary]="product.stockStatus === 'low'"
            >
              <div class="flex flex-col gap-1">
                <span
                  class="text-xxs font-black uppercase tracking-tighter px-2 py-0.5 rounded w-fit"
                  [class.bg-error/20]="product.stockStatus === 'critical'"
                  [class.text-error]="product.stockStatus === 'critical'"
                  [class.bg-secondary/20]="product.stockStatus === 'low'"
                  [class.text-secondary]="product.stockStatus === 'low'"
                >
                  {{ 'dashboard.pantry.status.' + product.stockStatus | translate }}
                </span>
                <h3 class="text-on-surface font-bold text-lg leading-tight">{{ product.name }}</h3>
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-black text-on-surface leading-none">
                    {{ product.currentStock | number: '2.0-0' }}
                  </span>
                  <span class="text-xxs text-on-surface-variant font-bold uppercase tracking-wider">BTLS</span>
                </div>
              </div>

              <ng-icon
                [name]="product.stockStatus === 'critical' ? 'lucideAlertCircle' : 'lucideAlertTriangle'"
                class="text-2xl"
                [class.text-error]="product.stockStatus === 'critical'"
                [class.text-secondary]="product.stockStatus === 'low'"
              />
            </div>
          }
        </div>
      </section>

      <section class="flex flex-col gap-4">
        <header class="flex justify-between items-end">
          <h2 class="text-on-surface font-bold tracking-tight text-lg">
            {{ 'dashboard.sections.roster' | translate }}
          </h2>
          <a
            [routerLink]="['/bars', barId(), 'roster']"
            class="text-primary text-xxs-plus font-black tracking-widest uppercase flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            {{ 'dashboard.sections.roster_full' | translate }}
            <ng-icon name="lucideArrowRight" />
          </a>
        </header>

        <div class="flex flex-col gap-3">
          @for (shift of rosterOverview(); track shift.id) {
            <div class="bg-surface-container rounded-2xl p-4 flex gap-4 items-center shadow-md">
              <div class="relative">
                <img
                  [src]="shift.userImage"
                  class="w-14 h-14 rounded-xl object-cover border border-outline-variant bg-surface-container-high"
                  [alt]="shift.userName"
                />
              </div>

              <div class="flex-1 flex flex-col justify-center">
                <h4 class="text-on-surface font-bold text-base leading-tight">{{ shift.userName }}</h4>
                <p class="text-on-surface-variant text-sm font-medium">{{ shift.roleLabel }}</p>
              </div>

              <div class="flex flex-col items-end gap-1">
                <span class="text-on-surface font-bold text-sm tracking-tighter">
                  {{ shift.timeRange }}
                </span>
                <span
                  class="text-xxs font-black tracking-widest uppercase"
                  [class.text-primary]="shift.status === 'current'"
                  [class.text-on-surface-variant]="shift.status === 'next'"
                >
                  {{ 'dashboard.roster.status.' + shift.status | translate }}
                </span>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- <section class="flex flex-col gap-4">
        <header class="flex flex-col gap-0.5">
          <h2 class="text-on-surface font-bold tracking-tight text-lg">
            {{ 'dashboard.sections.overview' | translate }}
          </h2>
          <p class="text-on-surface-variant text-sm font-medium">
            {{
              'dashboard.sections.overview_stats'
                | translate: { clockedIn: activeShifts().length, assigned: totalAssignedToday() }
            }}
          </p>
        </header>

        <div class="grid grid-cols-2 gap-3">
          @for (stat of overviewStats(); track stat.label) {
            <div
              class="bg-surface-container rounded-2xl p-6 flex flex-col items-center justify-center gap-1 shadow-sm border-b-2 border-transparent hover:border-primary transition-colors"
              [class.opacity-50]="stat.count === 0"
            >
              <span class="text-3xl font-black text-on-surface">{{ stat.count }}</span>
              <span class="text-xxs-plus font-bold text-on-surface-variant tracking-widest uppercase text-center">
                {{ stat.label | translate }}
              </span>
            </div>
          }

          <div
            [routerLink]="['/bars', barId(), 'staff']"
            class="bg-surface-container-high rounded-2xl p-6 flex flex-col items-center justify-center gap-1 shadow-sm border-b-2 border-transparent hover:border-primary transition-colors cursor-pointer active:scale-95"
          >
            <ng-icon name="lucidePlus" class="text-primary text-xl mb-1" />
            <span class="text-xxs-plus font-bold text-primary tracking-widest uppercase text-center">
              {{ 'dashboard.overview.manage_staff' | translate }}
            </span>
          </div>
        </div>
      </section> -->
    </div>
  `,
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
