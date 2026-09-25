import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, input, Type } from '@angular/core';
import type { EstablishmentId, EstablishmentMember, EstablishmentStats, Shift, Workday } from '@coaster/common';
import type { PageResource } from '@coaster/core';
import { MyMemberStore } from '@coaster/establishment-members';
import { ModulesStore } from '@coaster/establishments';
import type { Product } from '@coaster/products';
import { TranslatePipe } from '@ngx-translate/core';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';
import { canAccess, DASHBOARD_ACCESS, type DashboardAccess } from './dashboard-access';
import { InventoryAlertsWidget } from './widgets/inventory-alerts-widget/inventory-alerts-widget';
import { MyShiftWidget } from './widgets/my-shift-widget/my-shift-widget';
import { RevenueHistoryWidget } from './widgets/revenue-history-widget/revenue-history-widget';
import { SubscriptionWidget } from './widgets/subscription-widget/subscription-widget';
import { TeamTodayWidget } from './widgets/team-today-widget/team-today-widget';
import { TodayTakingsWidget } from './widgets/today-takings-widget/today-takings-widget';
import { WeeklyChartWidget } from './widgets/weekly-chart-widget/weekly-chart-widget';

interface DashboardWidget {
  component: Type<unknown>;
  access: DashboardAccess;
  inputs: Record<string, unknown>;
}

@Component({
  selector: 'coaster-dashboard',
  imports: [NgComponentOutlet, TranslatePipe, PageContainer, PageHeader],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  templateUrl: './dashboard.html',
})
export class Dashboard {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly stats = input.required<PageResource<EstablishmentStats>>();
  public readonly products = input.required<PageResource<Product[]>>();
  public readonly todayShifts = input.required<PageResource<Shift[]>>();
  public readonly members = input.required<PageResource<EstablishmentMember[]>>();
  public readonly myWorkdays = input.required<PageResource<Workday[]>>();
  public readonly runningWorkday = input.required<PageResource<Workday | null>>();

  readonly #myMemberStore = inject(MyMemberStore);
  readonly #modulesStore = inject(ModulesStore);

  readonly canViewFinancials = computed(() =>
    canAccess(DASHBOARD_ACCESS.takings, this.#myMemberStore, this.#modulesStore),
  );

  readonly subtitleKey = computed(() =>
    this.canViewFinancials() ? 'dashboard.subtitle.business' : 'dashboard.subtitle.personal',
  );

  readonly #businessWidgets = computed<DashboardWidget[]>(() => [
    {
      component: SubscriptionWidget,
      access: DASHBOARD_ACCESS.billing,
      inputs: { establishmentId: this.establishmentId() },
    },
    { component: TodayTakingsWidget, access: DASHBOARD_ACCESS.takings, inputs: { stats: this.stats() } },
    { component: WeeklyChartWidget, access: DASHBOARD_ACCESS.takings, inputs: { stats: this.stats() } },
    { component: RevenueHistoryWidget, access: DASHBOARD_ACCESS.takingsHistory, inputs: { stats: this.stats() } },
    {
      component: InventoryAlertsWidget,
      access: DASHBOARD_ACCESS.inventory,
      inputs: { establishmentId: this.establishmentId(), products: this.products() },
    },
    {
      component: TeamTodayWidget,
      access: DASHBOARD_ACCESS.team,
      inputs: { establishmentId: this.establishmentId(), shifts: this.todayShifts(), members: this.members() },
    },
  ]);

  readonly #personalWidgets = computed<DashboardWidget[]>(() => [
    {
      component: MyShiftWidget,
      access: DASHBOARD_ACCESS.clock,
      inputs: {
        establishmentId: this.establishmentId(),
        myWorkdays: this.myWorkdays(),
        runningWorkday: this.runningWorkday(),
      },
    },
  ]);

  readonly widgets = computed(() => {
    const ordered = this.canViewFinancials()
      ? [...this.#businessWidgets(), ...this.#personalWidgets()]
      : [...this.#personalWidgets(), ...this.#businessWidgets()];

    return ordered.filter((widget) => canAccess(widget.access, this.#myMemberStore, this.#modulesStore));
  });
}

export default Dashboard;
