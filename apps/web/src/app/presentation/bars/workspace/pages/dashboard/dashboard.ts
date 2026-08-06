import { Component, computed, effect, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { MyMemberStore } from '@coaster/bar-members';
import { BarSubscriptionStore, BillingAction, PlanDialogService } from '@coaster/bar-subscription';
import type { BarId } from '@coaster/common';
import { BarPermission, BarRole, ErrorCodes } from '@coaster/common';
import { ActionFeedback, ApiError } from '@coaster/core';
import { MembersStore } from '@coaster/bar-members';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { StatsStore } from '@coaster/stats';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../../components/loading/loading';
import { StatCard } from '../../../../components/stat-card/stat-card';
import { InventoryItemCard } from '../../components/inventory-item-card/inventory-item-card';
import { PricePipe } from '../../pipes/price/price';

import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';

@Component({
  selector: 'coaster-dashboard',
  imports: [
    TranslatePipe,
    MatIcon,
    MatButton,
    RouterLink,
    InventoryItemCard,
    PricePipe,
    Loading,
    StatCard,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    PageContainer,
    PageHeader,
    MatProgressSpinner,
  ],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
  templateUrl: './dashboard.html',
})
export class Dashboard {
  public readonly barId = input.required<BarId>();

  readonly #productsStore = inject(ProductsStore);
  readonly #membersStore = inject(MembersStore);
  readonly #shiftsStore = inject(ShiftsStore);
  readonly #statsStore = inject(StatsStore);
  readonly #barSubscriptionStore = inject(BarSubscriptionStore);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #planDialogService = inject(PlanDialogService);
  readonly #actionFeedback = inject(ActionFeedback);

  public readonly stats = this.#statsStore.stats;

  readonly canManageBilling = computed(() => this.#myMemberStore.hasPermission(BarPermission.BAR_MANAGE_BILLING));
  readonly subscription = computed(() => this.#barSubscriptionStore.subscription.value());
  readonly billingAction = this.#barSubscriptionStore.billingAction;
  readonly isOpeningBillingPortal = this.#barSubscriptionStore.isOpeningBillingPortal;
  readonly showBillingAction = this.#barSubscriptionStore.showBillingAction;
  readonly BillingAction = BillingAction;
  readonly trialDaysRemaining = computed(() => this.#barSubscriptionStore.trialDaysRemaining());
  readonly isTrialActive = computed(() => this.#barSubscriptionStore.isTrialActive());

  readonly planLabelKey = computed(() => {
    const sub = this.subscription();
    if (!sub || sub.plan === 'FREE') return 'billing.plan_name.free';
    return 'billing.plan_name.pro';
  });

  readonly isPendingCancel = computed(() => {
    const sub = this.subscription();
    if (!sub) return false;
    if (sub.status === 'CANCELED') {
      if (!sub.currentPeriodEnd) return true;
      return new Date() <= new Date(sub.currentPeriodEnd);
    }
    return false;
  });

  readonly statusLabelKey = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'billing.status.free';
    if (this.isPendingCancel()) {
      return 'billing.status.cancel_at_period_end';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'billing.status.active';
      case 'TRIALING':
        return 'billing.status.trialing';
      case 'PAST_DUE':
        return 'billing.status.past_due';
      case 'CANCELED':
        return 'billing.status.canceled';
      case 'UNPAID':
        return 'billing.status.unpaid';
      default:
        return 'billing.status.inactive';
    }
  });

  readonly periodInfoKey = computed(() => {
    const sub = this.subscription();
    if (!sub?.currentPeriodEnd) return null;
    if (this.isPendingCancel()) {
      return 'billing.cancels_on';
    }
    if (sub.status === 'ACTIVE') {
      return 'billing.renews_on';
    }
    return null;
  });

  readonly formattedPeriodEnd = computed(() => {
    const sub = this.subscription();
    if (!sub?.currentPeriodEnd) return null;
    return new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly formattedTrialEnds = computed(() => {
    const sub = this.subscription();
    if (!sub?.trialEndsAt) return null;
    return new Date(sub.trialEndsAt).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly statusIconContainerClass = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'bg-surface-container-highest text-on-surface-variant';
    if (this.isPendingCancel()) {
      return 'bg-secondary/15 text-secondary';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'bg-emerald-500/15 text-emerald-500';
      case 'TRIALING':
        return 'bg-sky-400/15 text-sky-400';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'bg-secondary/15 text-secondary';
      default:
        return 'bg-surface-container-highest text-on-surface-variant';
    }
  });

  readonly statusBadgeStyleClass = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'text-on-surface-variant bg-surface-container border-outline-variant/30';
    if (this.isPendingCancel()) {
      return 'text-secondary bg-secondary/10 border-secondary/20';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'TRIALING':
        return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'text-secondary bg-secondary/10 border-secondary/20';
      default:
        return 'text-on-surface-variant bg-surface-container border-outline-variant/30';
    }
  });

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

  async manageBilling(): Promise<void> {
    if (this.isOpeningBillingPortal()) {
      return;
    }

    try {
      const portalUrl = await this.#barSubscriptionStore.createCustomerPortalSession();
      if (portalUrl) {
        window.location.assign(portalUrl);
      } else {
        this.#actionFeedback.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        this.#actionFeedback.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    }
  }

  activatePro(): void {
    this.#planDialogService.open(this.barId());
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
          roleLabel: member.role === BarRole.OWNER ? 'Owner' : 'Staff Member',
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
      { label: 'dashboard.overview.bar_staff', count: members.filter((m) => m.role === BarRole.STAFF).length },
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
