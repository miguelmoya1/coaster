import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModulesStore, CurrentEstablishmentStore } from '@coaster/establishments';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore, PlanDialogService } from '@coaster/establishment-subscription';
import { ClockState, EstablishmentId, EstablishmentPermission, EstablishmentRole, hasPermission } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { MembersStore } from '@coaster/establishment-members';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { StatsStore } from '@coaster/stats';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './dashboard';
import { MyShiftWidget } from './widgets/my-shift-widget/my-shift-widget';
import { RevenueHistoryWidget } from './widgets/revenue-history-widget/revenue-history-widget';
import { SubscriptionWidget } from './widgets/subscription-widget/subscription-widget';
import { TodayTakingsWidget } from './widgets/today-takings-widget/today-takings-widget';

const emptyResource = (value: unknown) => ({
  value: vi.fn().mockReturnValue(value),
  isLoading: vi.fn().mockReturnValue(false),
  hasValue: vi.fn().mockReturnValue(true),
});

const modulesStoreMock = {
  currentEstablishmentId: signal(undefined).asReadonly(),
  settings: { isLoading: signal(false).asReadonly() },
  setEstablishmentId: vi.fn(),
  isModuleEnabled: vi.fn(() => true),
};

const membersStoreMock = { list: emptyResource([]), setEstablishmentId: vi.fn() };
const productsStoreMock = { list: emptyResource([]), setEstablishmentId: vi.fn() };
const shiftsStoreMock = { shifts: emptyResource([]), setEstablishmentId: vi.fn(), setDateRange: vi.fn() };

const statsStoreMock = {
  stats: emptyResource({
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
  }),
  setEstablishmentId: vi.fn(),
};

const timeTrackingStoreMock = {
  myWorkdays: emptyResource([]),
  actionableWorkday: () => undefined,
  clockState: () => ClockState.OUT,
  setEstablishmentId: vi.fn(),
  setRange: vi.fn(),
  clock: vi.fn(),
};

const establishmentSubscriptionStoreMock = {
  subscription: { value: signal({ status: 'ACTIVE', plan: 'PRO' }) },
  billingAction: signal('MANAGE').asReadonly(),
  showBillingAction: signal(true).asReadonly(),
  isOpeningBillingPortal: signal(false).asReadonly(),
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
      { provide: MembersStore, useValue: membersStoreMock },
      { provide: ModulesStore, useValue: modulesStoreMock },
      { provide: ProductsStore, useValue: productsStoreMock },
      { provide: ShiftsStore, useValue: shiftsStoreMock },
      { provide: StatsStore, useValue: statsStoreMock },
      { provide: TimeTrackingStore, useValue: timeTrackingStoreMock },
      { provide: EstablishmentSubscriptionStore, useValue: establishmentSubscriptionStoreMock },
      {
        provide: MyMemberStore,
        useValue: {
          hasPermission: (permission: EstablishmentPermission) => hasPermission(role, permission),
        },
      },
      { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
      { provide: PlanDialogService, useValue: { open: vi.fn() } },
      { provide: ActionFeedback, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Dashboard);
  fixture.componentRef.setInput('establishmentId', 'establishment-1');

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
      const widgets = fixture.componentInstance.widgets();

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
      const widgets = fixture.componentInstance.widgets();

      expect(widgets).toContain(TodayTakingsWidget);
      expect(widgets).not.toContain(RevenueHistoryWidget);
      expect(widgets).not.toContain(SubscriptionWidget);
    });
  });

  describe('STAFF', () => {
    it('should lead with its own shift and be shown no money at all', async () => {
      const fixture = await buildFixture(EstablishmentRole.STAFF);
      const widgets = fixture.componentInstance.widgets();

      expect(widgets[0]).toBe(MyShiftWidget);
      expect(widgets).not.toContain(TodayTakingsWidget);
      expect(widgets).not.toContain(RevenueHistoryWidget);
      expect(widgets).not.toContain(SubscriptionWidget);
    });

    it('should not even ask the server for takings it is not allowed to read', async () => {
      const fixture = await buildFixture(EstablishmentRole.STAFF);

      await fixture.whenStable();

      expect(statsStoreMock.setEstablishmentId).toHaveBeenCalledWith(undefined);
      expect(statsStoreMock.setEstablishmentId).not.toHaveBeenCalledWith('establishment-1');
    });
  });

  it('should hide the takings when the establishment has no orders module', async () => {
    modulesStoreMock.isModuleEnabled.mockReturnValue(false);

    const fixture = await buildFixture(EstablishmentRole.OWNER);
    const widgets = fixture.componentInstance.widgets();

    expect(widgets).not.toContain(TodayTakingsWidget);

    modulesStoreMock.isModuleEnabled.mockReturnValue(true);
  });
});
