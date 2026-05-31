import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BarId, OrderStatus } from '@coaster/common';
import { MembersStore } from '@coaster/members';
import { OrdersStore } from '@coaster/orders';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideAlertTriangle,
  lucideArrowRight,
  lucideCalendar,
  lucideCheckCircle2,
  lucideChevronRight,
  lucidePlus,
  lucideTrendingUp,
  lucideUsers,
} from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { InventoryItemCard } from '../../components/inventory-item-card/inventory-item-card';
import { PricePipe } from '../../pipes/price/price';

@Component({
  selector: 'coaster-dashboard',
  imports: [TranslatePipe, NgIcon, RouterLink, InventoryItemCard, PricePipe],
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
      lucideTrendingUp,
      lucideCalendar,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  public readonly barId = input.required<BarId>();

  readonly #productsStore = inject(ProductsStore);
  readonly #membersStore = inject(MembersStore);
  readonly #shiftsStore = inject(ShiftsStore);
  readonly #ordersStore = inject(OrdersStore);

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
      this.#ordersStore.setBarId(barId);
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

  readonly financialStats = computed(() => {
    if (!this.#ordersStore.list.hasValue()) {
      return {
        todayRevenue: 0,
        yesterdayRevenue: 0,
        weeklyRevenue: 0,
        dailyRevenues: [],
        maxDayRevenue: 0,
      };
    }

    const allOrders = this.#ordersStore.list.value() ?? [];
    const now = new Date();

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(now);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - distanceToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    let todayRevenue = 0;
    let yesterdayRevenue = 0;
    let weeklyRevenue = 0;

    const dailyRevenues: { dayName: string; amount: number; dateStr: string }[] = [];
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      dailyRevenues.push({
        dayName: days[i],
        amount: 0,
        dateStr: formatDate(d),
      });
    }

    allOrders.forEach((order) => {
      if (order.status !== OrderStatus.CLOSED) return;
      if (!order.createdAt) return;

      const orderDate = new Date(order.createdAt);
      const orderDateStr = formatDate(orderDate);

      if (orderDateStr === todayStr) {
        todayRevenue += order.totalAmount;
      }
      if (orderDateStr === yesterdayStr) {
        yesterdayRevenue += order.totalAmount;
      }
      if (orderDate >= startOfWeek) {
        weeklyRevenue += order.totalAmount;
      }

      const dayIndex = dailyRevenues.findIndex((dr) => dr.dateStr === orderDateStr);
      if (dayIndex !== -1) {
        dailyRevenues[dayIndex].amount += order.totalAmount;
      }
    });

    const maxDayRevenue = Math.max(...dailyRevenues.map((dr) => dr.amount), 1);

    return {
      todayRevenue,
      yesterdayRevenue,
      weeklyRevenue,
      dailyRevenues,
      maxDayRevenue,
    };
  });

  readonly chartPaths = computed(() => {
    const stats = this.financialStats();
    const revenues = stats.dailyRevenues;
    const max = stats.maxDayRevenue;

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
}

export default Dashboard;
