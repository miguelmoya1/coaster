import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MyMemberStore, BarSubscriptionStore } from '@coaster/bars';
import { Auth, CurrentUser } from '@coaster/core';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  };

  const myMemberStoreMock = {
    isOwner: signal(true).asReadonly(),
  };

  const barSubscriptionStoreMock = {
    subscription: signal({ status: 'ready', value: { status: 'INACTIVE' } }).asReadonly(),
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
        { provide: BarSubscriptionStore, useValue: barSubscriptionStoreMock },
        { provide: Auth, useValue: authMock },
        { provide: CurrentUser, useValue: currentUserMock },
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
    it('should log out and navigate to /app/login when logout is called', async () => {
      await component.logout();
      expect(authMock.logout).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/app/login'], { replaceUrl: true });
    });
  });
});
