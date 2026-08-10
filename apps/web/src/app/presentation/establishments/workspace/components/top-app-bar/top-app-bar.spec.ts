import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore } from '@coaster/establishment-subscription';
import { EstablishmentPermission } from '@coaster/common';
import type { EstablishmentId } from '@coaster/common';
import { Auth, CurrentUser } from '@coaster/core';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AiVoiceService } from '../ai-assistant/ai-voice.service';
import { TopAppBar } from './top-app-bar';

describe('TopAppBar', () => {
  let component: TopAppBar;
  let fixture: ComponentFixture<TopAppBar>;
  let translateService: TranslateService;
  let router: Router;

  const isAuthenticated = signal(true);
  const authMock = {
    isAuthenticated: isAuthenticated.asReadonly(),
    logout: vi.fn().mockResolvedValue(undefined),
  };

  const currentUserMock = {
    updateLanguage: vi.fn().mockImplementation((lang: string) => {
      translateService.use(lang);
      return Promise.resolve();
    }),
    isAdmin: signal(false),
  };

  const myMemberStoreMock = {
    isOwner: signal(true).asReadonly(),
    hasPermission: vi
      .fn()
      .mockImplementation(
        (perm: EstablishmentPermission) => perm === EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
      ),
  };

  const aiVoiceServiceMock = {
    isOpen: signal(false),
    status: signal('idle'),
    toggle: vi.fn(),
  };

  const subscriptionSignal = signal<{ status: string; currentPeriodEnd?: string } | null>({ status: 'INACTIVE' });
  const establishmentSubscriptionStoreMock = {
    isReadOnly: signal(false).asReadonly(),
    subscription: {
      value: subscriptionSignal,
    },
    billingAction: computed(() => (subscriptionSignal()?.status === 'ACTIVE' ? 'MANAGE' : 'ACTIVATE')),
    showBillingAction: signal(true).asReadonly(),
    isOpeningBillingPortal: signal(false).asReadonly(),
    createCheckoutSession: vi.fn().mockResolvedValue('https://checkout.example.com'),
    createCustomerPortalSession: vi.fn().mockResolvedValue('https://billing.example.com'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopAppBar],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: EstablishmentSubscriptionStore, useValue: establishmentSubscriptionStoreMock },
        { provide: Auth, useValue: authMock },
        { provide: CurrentUser, useValue: currentUserMock },
        { provide: AiVoiceService, useValue: aiVoiceServiceMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(TopAppBar);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    router = TestBed.inject(Router);

    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture.componentRef.setInput('label', 'Dashboard');
    fixture.componentRef.setInput('image', 'https://photo.url/user.jpg');
    fixture.componentRef.setInput('establishmentId', 'establishment-123' as EstablishmentId);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should display the title label', () => {
      const title = fixture.nativeElement.querySelector('h1.heading-1');
      expect(title.textContent).toContain('Dashboard');
    });

    it('should display the user image in avatar badge', () => {
      const avatar = fixture.nativeElement.querySelector('coaster-avatar-badge');
      expect(avatar).toBeTruthy();
      expect(component.image()).toBe('https://photo.url/user.jpg');
    });

    it('should offer the AI assistant next to the overflow menu', () => {
      const trigger = fixture.nativeElement.querySelector('coaster-ai-assistant-trigger');
      expect(trigger).toBeTruthy();

      trigger.querySelector('button').click();
      expect(aiVoiceServiceMock.toggle).toHaveBeenCalled();
    });
  });

  describe('permissions and subscription status', () => {
    it('should calculate canManageBilling based on ESTABLISHMENT_MANAGE_BILLING permission', () => {
      expect(myMemberStoreMock.hasPermission).toHaveBeenCalledWith(
        EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING,
      );
      expect(component.canManageBilling()).toBe(true);
    });

    it('should evaluate isProActive as false when subscription status is INACTIVE', () => {
      subscriptionSignal.set({ status: 'INACTIVE' });
      expect(component.isProActive()).toBe(false);
    });

    it('should evaluate isProActive as true when subscription status is ACTIVE', () => {
      subscriptionSignal.set({ status: 'ACTIVE' });
      expect(component.isProActive()).toBe(true);
    });

    it('should compute statusBadgeKey as cancel_at_period_end when status is CANCELED and period is active', () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      subscriptionSignal.set({ status: 'CANCELED', currentPeriodEnd: futureDate });
      expect(component.statusBadgeKey()).toBe('billing.status_badge.cancel_at_period_end');
    });
  });

  describe('language switching', () => {
    it('should change language to English', () => {
      const spyUse = vi.spyOn(translateService, 'use');
      component.setLanguage('en');
      expect(spyUse).toHaveBeenCalledWith('en');
      expect(component.currentLang()).toBe('en');
    });

    it('should change language to Spanish', () => {
      const spyUse = vi.spyOn(translateService, 'use');
      component.setLanguage('es');
      expect(spyUse).toHaveBeenCalledWith('es');
      expect(component.currentLang()).toBe('es');
    });
  });

  describe('menu actions', () => {
    it('should log out and navigate to /login when logout is called', async () => {
      await component.logout();
      expect(authMock.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    });
  });

  describe('the way back to the establishment settings', () => {
    /*
     * hasPermission is a plain mock behind a computed, so the component caches whatever it answered
     * first. The permission has to be in place before the component exists.
     */
    const renderWith = (allowed: boolean) => {
      myMemberStoreMock.hasPermission.mockImplementation(
        (perm: EstablishmentPermission) => allowed && perm === EstablishmentPermission.ESTABLISHMENT_MANAGE_SETTINGS,
      );

      const own = TestBed.createComponent(TopAppBar);
      own.componentRef.setInput('label', 'Dashboard');
      own.componentRef.setInput('image', 'https://photo.url/user.jpg');
      own.componentRef.setInput('establishmentId', 'establishment-123' as EstablishmentId);
      own.detectChanges();

      own.nativeElement.querySelector('button[aria-label="Open menu"]').click();
      own.detectChanges();

      return own;
    };

    const settingsHrefs = () =>
      Array.from(document.querySelectorAll('a.mat-mdc-menu-item'))
        .map((item) => (item as HTMLAnchorElement).getAttribute('href'))
        .filter((href) => href?.endsWith('/settings'));

    afterEach(() => {
      document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => overlay.remove());
    });

    it('should offer an owner a way into the settings from the overflow menu', () => {
      renderWith(true);

      expect(settingsHrefs()).toEqual(['/establishments/establishment-123/settings']);
    });

    it('should keep it away from anyone who cannot change them', () => {
      renderWith(false);

      expect(settingsHrefs()).toEqual([]);
    });
  });

  describe('admin shortcut', () => {
    const adminLink = () => fixture.nativeElement.querySelector('a[href="/admin/overview"]');

    it('should not offer the admin panel to a regular user', () => {
      expect(adminLink()).toBeNull();
    });

    it('should link an admin straight to the panel, beside the AI trigger', () => {
      currentUserMock.isAdmin.set(true);
      fixture.detectChanges();

      const link = adminLink();
      expect(link).toBeTruthy();
      expect(link.nextElementSibling?.tagName.toLowerCase()).toBe('coaster-ai-assistant-trigger');
    });
  });
});
