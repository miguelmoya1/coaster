import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import { Auth, CurrentUser, Socket } from '@coaster/core';
import { MembersStore } from '@coaster/establishment-members';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspaceLayout from './workspace-layout';

describe('WorkspaceLayout', () => {
  let component: WorkspaceLayout;
  let fixture: ComponentFixture<WorkspaceLayout>;

  const currentUserMock = {
    current: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue({ id: 'u-1', name: 'Test User', photoUrl: '' }),
    },
    isAdmin: signal(false),
  };

  const currentEstablishmentStoreMock = {
    current: {
      hasValue: vi.fn().mockReturnValue(true),
      value: vi.fn().mockReturnValue({ name: 'Test Establishment' }),
    },
    currentId: signal('establishment-1'),
    setEstablishmentId: vi.fn(),
  };

  const myMemberStoreMock = {
    isOwner: signal(false),
    hasPermission: vi.fn().mockReturnValue(true),
    setEstablishmentId: vi.fn(),
  };

  const membersStoreMock = {
    list: {
      value: vi.fn().mockReturnValue([]),
      hasValue: vi.fn().mockReturnValue(true),
      isLoading: vi.fn().mockReturnValue(false),
    },
    setEstablishmentId: vi.fn(),
  };

  const socketMock = {
    joinEstablishment: vi.fn(),
    leaveEstablishment: vi.fn(),
    subscriptionUpdated: signal(null),
  };

  const authMock = {
    logout: vi.fn().mockResolvedValue(undefined),
  };

  const establishmentSubscriptionStoreMock = {
    setEstablishmentId: vi.fn(),
    isReadOnly: signal(false),
    isTrialExpiringSoon: signal(false),
    showSubscriptionBanner: signal(false),
    billingAction: signal('ACTIVATE'),
    isOpeningBillingPortal: signal(false),
    showBillingAction: signal(true),
    trialDaysRemaining: signal(14),
    subscription: {
      value: vi.fn().mockReturnValue(null),
      hasValue: vi.fn().mockReturnValue(false),
    },
    reloadSubscription: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceLayout],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
        { provide: EstablishmentSubscriptionStore, useValue: establishmentSubscriptionStoreMock },
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: MembersStore, useValue: membersStoreMock },
        { provide: Socket, useValue: socketMock },
        { provide: Auth, useValue: authMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(WorkspaceLayout);
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

    it('should feed the establishment id to every establishment-scoped store', () => {
      expect(currentEstablishmentStoreMock.setEstablishmentId).toHaveBeenCalledWith('establishment-1');
      expect(membersStoreMock.setEstablishmentId).toHaveBeenCalledWith('establishment-1');
      expect(myMemberStoreMock.setEstablishmentId).toHaveBeenCalledWith('establishment-1');
      expect(establishmentSubscriptionStoreMock.setEstablishmentId).toHaveBeenCalledWith('establishment-1');
    });

    it('should clear the establishment id on every establishment-scoped store when destroyed', () => {
      fixture.destroy();

      expect(currentEstablishmentStoreMock.setEstablishmentId).toHaveBeenCalledWith(undefined);
      expect(membersStoreMock.setEstablishmentId).toHaveBeenCalledWith(undefined);
      expect(myMemberStoreMock.setEstablishmentId).toHaveBeenCalledWith(undefined);
      expect(establishmentSubscriptionStoreMock.setEstablishmentId).toHaveBeenCalledWith(undefined);
    });
  });

  describe('rendering', () => {
    it('should render top app establishment when user has value', () => {
      fixture.detectChanges();
      const topBar = fixture.nativeElement.querySelector('coaster-top-app-bar');
      expect(topBar).toBeTruthy();
    });

    it('should render router outlet', () => {
      fixture.detectChanges();
      const outlet = fixture.nativeElement.querySelector('router-outlet');
      expect(outlet).toBeTruthy();
    });

    it('should render bottom nav', () => {
      fixture.detectChanges();
      const bottomNav = fixture.nativeElement.querySelector('coaster-bottom-nav');
      expect(bottomNav).toBeTruthy();
    });
  });
});
