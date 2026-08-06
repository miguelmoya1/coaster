import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentBarStore } from '@coaster/bars';
import { MyMemberStore } from '@coaster/bar-members';
import { BarSubscriptionStore, PlanDialogService } from '@coaster/bar-subscription';
import { BarId, BarPermission } from '@coaster/common';
import { MembersStore } from '@coaster/bar-members';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { StatsStore } from '@coaster/stats';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './dashboard';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  const membersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
  };

  const productsStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
  };

  const shiftsStoreMock = {
    shifts: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    setDateRange: vi.fn(),
  };

  const statsStoreMock = {
    stats: {
      value: vi.fn().mockReturnValue({
        todayRevenue: 0,
        yesterdayRevenue: 0,
        weeklyRevenue: 0,
        dailyRevenues: [],
        currentMonthRevenue: 0,
        previousMonthRevenue: 0,
        yearlyRevenue: 0,
        monthlyBreakdown: [],
        percentageChange: 0,
        isPositiveChange: true,
        maxMonthRevenue: 1,
      }),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
  };

  const subscriptionSignal = signal({ status: 'ACTIVE', plan: 'PRO' });
  const barSubscriptionStoreMock = {
    subscription: {
      value: subscriptionSignal,
    },
    billingAction: signal('MANAGE').asReadonly(),
    showBillingAction: signal(true).asReadonly(),
    trialDaysRemaining: signal(0).asReadonly(),
    isTrialActive: signal(false).asReadonly(),
    createCustomerPortalSession: vi.fn().mockResolvedValue('https://stripe.portal'),
    createCheckoutSession: vi.fn().mockResolvedValue('https://stripe.checkout'),
  };

  const myMemberStoreMock = {
    hasPermission: vi.fn().mockImplementation((perm: BarPermission) => perm === BarPermission.BAR_MANAGE_BILLING),
  };

  const currentBarStoreMock = {
    currentId: signal<BarId | undefined>('bar-1' as BarId).asReadonly(),
  };

  const planDialogServiceMock = {
    open: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MembersStore, useValue: membersStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: ShiftsStore, useValue: shiftsStoreMock },
        { provide: StatsStore, useValue: statsStoreMock },
        { provide: BarSubscriptionStore, useValue: barSubscriptionStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: CurrentBarStore, useValue: currentBarStoreMock },
        { provide: PlanDialogService, useValue: planDialogServiceMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Dashboard);
    fixture.componentRef.setInput('barId', 'bar-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('barId input', () => {
    it('should expose barId with provided value', () => {
      expect(component.barId()).toBe('bar-1');
    });
  });

  describe('computed properties', () => {
    it('should return empty pantry alerts when no products', () => {
      expect(component.pantryAlerts()).toEqual([]);
    });

    it('should return empty active shifts when no shifts', () => {
      expect(component.activeShifts()).toEqual([]);
    });

    it('should return 0 for totalAssignedToday when no shifts', () => {
      expect(component.totalAssignedToday()).toBe(0);
    });

    it('should return empty roster overview when no shifts', () => {
      expect(component.rosterOverview()).toEqual([]);
    });

    it('should return overview stats with 0 counts', () => {
      const stats = component.overviewStats();
      expect(stats.length).toBe(3);
      expect(stats[0].count).toBe(0);
    });

    it('should compute statusLabelKey as cancel_at_period_end when status is CANCELED and period is active', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      subscriptionSignal.set({ status: 'CANCELED', currentPeriodEnd: futureDate } as any);
      expect(component.statusLabelKey()).toBe('billing.status.cancel_at_period_end');
      expect(component.periodInfoKey()).toBe('billing.cancels_on');
    });
  });

  describe('rendering', () => {
    it('should render pantry section heading', () => {
      fixture.detectChanges();
      const heading = fixture.nativeElement.querySelector('h2');
      expect(heading).toBeTruthy();
    });

    it('should render roster section', () => {
      fixture.detectChanges();
      const sections = fixture.nativeElement.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });
});
