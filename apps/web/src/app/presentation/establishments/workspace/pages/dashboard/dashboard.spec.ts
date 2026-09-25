import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModulesStore, CurrentEstablishmentStore } from '@coaster/establishments';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore, BillingEntryPoint } from '@coaster/establishment-subscription';
import type { EstablishmentMember, EstablishmentStats, Shift, Workday } from '@coaster/common';
import {
  asEstablishmentId,
  EstablishmentId,
  EstablishmentPermission,
  EstablishmentRole,
  hasPermission,
} from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import type { Product } from '@coaster/products';
import { fakeResource } from '@coaster/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './dashboard';
import { accessibleEstablishmentId, DASHBOARD_ACCESS } from './dashboard-access';
import { MyShiftWidget } from './widgets/my-shift-widget/my-shift-widget';
import { RevenueHistoryWidget } from './widgets/revenue-history-widget/revenue-history-widget';
import { SubscriptionWidget } from './widgets/subscription-widget/subscription-widget';
import { TodayTakingsWidget } from './widgets/today-takings-widget/today-takings-widget';

const modulesStoreMock = {
  currentEstablishmentId: signal(undefined).asReadonly(),
  settings: { isLoading: signal(false).asReadonly() },
  setEstablishmentId: vi.fn(),
  isModuleEnabled: vi.fn(() => true),
};

const stats = {
  todayRevenue: 0,
  yesterdayRevenue: 0,
  sameWeekdayLastWeekRevenue: 0,
  weeklyRevenue: 0,
  dailyRevenues: [],
  todayTicketCount: 0,
  todayAverageTicket: 0,
  todayCashRevenue: 0,
  todayCardRevenue: 0,
  todayTipAmount: 0,
  history: null,
} as unknown as EstablishmentStats;

const establishmentSubscriptionStoreMock = {
  subscription: { value: signal({ status: 'ACTIVE', plan: 'PRO' }) },
  billingAction: signal('MANAGE').asReadonly(),
  showBillingAction: signal(true).asReadonly(),
  isOpeningBillingPortal: signal(false).asReadonly(),
  isPendingCancellation: signal(false).asReadonly(),
  createCustomerPortalSession: vi.fn().mockResolvedValue('https://stripe.portal'),
};

const currentEstablishmentStoreMock = {
  currentId: signal<EstablishmentId | undefined>('establishment-1' as EstablishmentId).asReadonly(),
};

const buildFixture = async (role: EstablishmentRole): Promise<ComponentFixture<Dashboard>> => {
  TestBed.resetTestingModule();

  await TestBed.configureTestingModule({
    imports: [Dashboard],
    providers: [
      provideTranslateService(),
      provideRouter([]),
      { provide: ModulesStore, useValue: modulesStoreMock },
      { provide: EstablishmentSubscriptionStore, useValue: establishmentSubscriptionStoreMock },
      {
        provide: MyMemberStore,
        useValue: {
          hasPermission: (permission: EstablishmentPermission) => hasPermission(role, permission),
        },
      },
      { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
      { provide: BillingEntryPoint, useValue: { open: vi.fn() } },
      { provide: ActionFeedback, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Dashboard);
  fixture.componentRef.setInput('establishmentId', 'establishment-1');
  fixture.componentRef.setInput('stats', fakeResource(stats).resource);
  fixture.componentRef.setInput('products', fakeResource<Product[]>([]).resource);
  fixture.componentRef.setInput('todayShifts', fakeResource<Shift[]>([]).resource);
  fixture.componentRef.setInput('members', fakeResource<EstablishmentMember[]>([]).resource);
  fixture.componentRef.setInput('myWorkdays', fakeResource<Workday[]>([]).resource);
  fixture.componentRef.setInput('runningWorkday', fakeResource<Workday | null>(null).resource);

  return fixture;
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create', async () => {
    const fixture = await buildFixture(EstablishmentRole.OWNER);

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.establishmentId()).toBe('establishment-1');
  });

  describe('OWNER', () => {
    it('should lead with the money and still reach its own shift', async () => {
      const fixture = await buildFixture(EstablishmentRole.OWNER);
      const widgets = fixture.componentInstance.widgets().map((widget) => widget.component);

      expect(widgets[0]).toBe(SubscriptionWidget);
      expect(widgets).toContain(TodayTakingsWidget);
      expect(widgets).toContain(RevenueHistoryWidget);
      expect(widgets).toContain(MyShiftWidget);
      expect(widgets.indexOf(TodayTakingsWidget)).toBeLessThan(widgets.indexOf(MyShiftWidget));
    });
  });

  describe('MANAGER', () => {
    it('should see the daily takings but neither the history nor the billing card', async () => {
      const fixture = await buildFixture(EstablishmentRole.MANAGER);
      const widgets = fixture.componentInstance.widgets().map((widget) => widget.component);

      expect(widgets).toContain(TodayTakingsWidget);
      expect(widgets).not.toContain(RevenueHistoryWidget);
      expect(widgets).not.toContain(SubscriptionWidget);
    });
  });

  describe('STAFF', () => {
    it('should lead with its own shift and be shown no money at all', async () => {
      const fixture = await buildFixture(EstablishmentRole.STAFF);
      const widgets = fixture.componentInstance.widgets().map((widget) => widget.component);

      expect(widgets[0]).toBe(MyShiftWidget);
      expect(widgets).not.toContain(TodayTakingsWidget);
      expect(widgets).not.toContain(RevenueHistoryWidget);
      expect(widgets).not.toContain(SubscriptionWidget);
    });

    it('should not even ask the server for takings it is not allowed to read', async () => {
      await buildFixture(EstablishmentRole.STAFF);

      const takings = TestBed.runInInjectionContext(() =>
        accessibleEstablishmentId(signal(asEstablishmentId('establishment-1')), DASHBOARD_ACCESS.takings),
      );
      const shift = TestBed.runInInjectionContext(() =>
        accessibleEstablishmentId(signal(asEstablishmentId('establishment-1')), DASHBOARD_ACCESS.clock),
      );

      expect(takings()).toBeUndefined();
      expect(shift()).toBe('establishment-1');
    });
  });

  it('should hand each widget the resource it reads', async () => {
    const fixture = await buildFixture(EstablishmentRole.OWNER);
    const takings = fixture.componentInstance.widgets().find((widget) => widget.component === TodayTakingsWidget);

    expect(takings?.inputs).toEqual({ stats: fixture.componentInstance.stats() });
  });

  it('should hide the takings when the establishment has no orders module', async () => {
    modulesStoreMock.isModuleEnabled.mockReturnValue(false);

    const fixture = await buildFixture(EstablishmentRole.OWNER);
    const widgets = fixture.componentInstance.widgets().map((widget) => widget.component);

    expect(widgets).not.toContain(TodayTakingsWidget);

    modulesStoreMock.isModuleEnabled.mockReturnValue(true);
  });
});
