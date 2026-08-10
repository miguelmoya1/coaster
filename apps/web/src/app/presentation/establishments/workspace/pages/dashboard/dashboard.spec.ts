import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ModulesStore, CurrentEstablishmentStore } from '@coaster/establishments';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore, PlanDialogService } from '@coaster/establishment-subscription';
import { EstablishmentId, EstablishmentPermission } from '@coaster/common';
import { MembersStore } from '@coaster/establishment-members';
import { ProductsStore } from '@coaster/products';
import { ShiftsStore } from '@coaster/shifts';
import { StatsStore } from '@coaster/stats';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from './dashboard';

const modulesStoreMock = {
  currentEstablishmentId: signal(undefined).asReadonly(),
  settings: { isLoading: signal(false).asReadonly() },
  setEstablishmentId: vi.fn(),
  isModuleEnabled: vi.fn(() => true),
};

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;

  const membersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setEstablishmentId: vi.fn(),
  };

  const productsStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setEstablishmentId: vi.fn(),
  };

  const shiftsStoreMock = {
    shifts: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setEstablishmentId: vi.fn(),
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
    setEstablishmentId: vi.fn(),
  };

  const subscriptionSignal = signal({ status: 'ACTIVE', plan: 'PRO' });
  const establishmentSubscriptionStoreMock = {
    subscription: {
      value: subscriptionSignal,
    },
    billingAction: signal('MANAGE').asReadonly(),
    showBillingAction: signal(true).asReadonly(),
    isOpeningBillingPortal: signal(false).asReadonly(),
    trialDaysRemaining: signal(0).asReadonly(),
    isTrialActive: signal(false).asReadonly(),
    createCustomerPortalSession: vi.fn().mockResolvedValue('https://stripe.portal'),
    createCheckoutSession: vi.fn().mockResolvedValue('https://stripe.checkout'),
  };

  const myMemberStoreMock = {
    hasPermission: vi
      .fn()
      .mockImplementation(
        (perm: EstablishmentPermission) => perm === EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
      ),
  };

  const currentEstablishmentStoreMock = {
    currentId: signal<EstablishmentId | undefined>('establishment-1' as EstablishmentId).asReadonly(),
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
        { provide: ModulesStore, useValue: modulesStoreMock },
        { provide: ProductsStore, useValue: productsStoreMock },
        { provide: ShiftsStore, useValue: shiftsStoreMock },
        { provide: StatsStore, useValue: statsStoreMock },
        { provide: EstablishmentSubscriptionStore, useValue: establishmentSubscriptionStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
        { provide: PlanDialogService, useValue: planDialogServiceMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Dashboard);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('establishmentId input', () => {
    it('should expose establishmentId with provided value', () => {
      expect(component.establishmentId()).toBe('establishment-1');
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

    it('should return empty schedule overview when no shifts', () => {
      expect(component.scheduleOverview()).toEqual([]);
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

    it('should render schedule section', () => {
      fixture.detectChanges();
      const sections = fixture.nativeElement.querySelectorAll('section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });
  });
});
