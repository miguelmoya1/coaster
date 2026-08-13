import { NgComponentOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, Type } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import { MyMemberStore } from '@coaster/establishment-members';
import { ModulesStore } from '@coaster/establishments';
import { StatsStore } from '@coaster/stats';
import { TranslatePipe } from '@ngx-translate/core';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';
import { InventoryAlertsWidget } from './widgets/inventory-alerts-widget/inventory-alerts-widget';
import { MyShiftWidget } from './widgets/my-shift-widget/my-shift-widget';
import { RevenueHistoryWidget } from './widgets/revenue-history-widget/revenue-history-widget';
import { SubscriptionWidget } from './widgets/subscription-widget/subscription-widget';
import { TeamTodayWidget } from './widgets/team-today-widget/team-today-widget';
import { TodayTakingsWidget } from './widgets/today-takings-widget/today-takings-widget';
import { WeeklyChartWidget } from './widgets/weekly-chart-widget/weekly-chart-widget';

interface DashboardWidget {
  component: Type<unknown>;
  requiredPermission?: EstablishmentPermission;
  requiredModule?: EstablishmentModule;
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

  readonly #myMemberStore = inject(MyMemberStore);
  readonly #modulesStore = inject(ModulesStore);
  readonly #statsStore = inject(StatsStore);

  constructor() {
    effect(() => {
      this.#statsStore.setEstablishmentId(this.canViewFinancials() ? this.establishmentId() : undefined);
    });
  }

  readonly canViewFinancials = computed(
    () =>
      this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS) &&
      this.#modulesStore.isModuleEnabled(EstablishmentModule.ORDERS),
  );

  readonly subtitleKey = computed(() =>
    this.canViewFinancials() ? 'dashboard.subtitle.business' : 'dashboard.subtitle.personal',
  );

  readonly #businessWidgets = computed<DashboardWidget[]>(() => [
    { component: SubscriptionWidget, requiredPermission: EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING },
    {
      component: TodayTakingsWidget,
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS,
      requiredModule: EstablishmentModule.ORDERS,
    },
    {
      component: WeeklyChartWidget,
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS,
      requiredModule: EstablishmentModule.ORDERS,
    },
    {
      component: RevenueHistoryWidget,
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS_HISTORY,
      requiredModule: EstablishmentModule.ORDERS,
    },
    {
      component: InventoryAlertsWidget,
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS,
      requiredModule: EstablishmentModule.INVENTORY,
    },
    { component: TeamTodayWidget, requiredPermission: EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT },
  ]);

  readonly #personalWidgets = computed<DashboardWidget[]>(() => [
    { component: MyShiftWidget, requiredPermission: EstablishmentPermission.ESTABLISHMENT_CLOCK_IN },
  ]);

  readonly widgets = computed(() => {
    const ordered = this.canViewFinancials()
      ? [...this.#businessWidgets(), ...this.#personalWidgets()]
      : [...this.#personalWidgets(), ...this.#businessWidgets()];

    return ordered
      .filter(
        (widget) =>
          (!widget.requiredPermission || this.#myMemberStore.hasPermission(widget.requiredPermission)) &&
          (!widget.requiredModule || this.#modulesStore.isModuleEnabled(widget.requiredModule)),
      )
      .map((widget) => widget.component);
  });

  readonly widgetInputs = computed(() => ({ establishmentId: this.establishmentId() }));
}

export default Dashboard;
