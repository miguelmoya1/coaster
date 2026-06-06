import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Auth } from '@coaster/core';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TopAppBar } from './top-app-bar';

describe('TopAppBar', () => {
  let component: TopAppBar;
  let fixture: ComponentFixture<TopAppBar>;
  let translateService: TranslateService;
  let router: Router;

  const authMock = {
    logout: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopAppBar],
      providers: [provideTranslateService(), provideRouter([]), { provide: Auth, useValue: authMock }],
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

  describe('menu behavior', () => {
    it('should not display the dropdown by default', () => {
      expect(component.isMenuOpen()).toBe(false);
      const dropdown = fixture.nativeElement.querySelector('.absolute');
      expect(dropdown).toBeFalsy();
    });

    it('should toggle menu open state on trigger click', () => {
      const trigger = fixture.nativeElement.querySelector('button[aria-label="Open menu"]');
      expect(trigger).toBeTruthy();

      // Open menu
      trigger.click();
      fixture.detectChanges();
      expect(component.isMenuOpen()).toBe(true);

      const dropdown = fixture.nativeElement.querySelector('.absolute');
      expect(dropdown).toBeTruthy();

      // Close menu
      trigger.click();
      fixture.detectChanges();
      expect(component.isMenuOpen()).toBe(false);
    });

    it('should close the menu when clicking on the backdrop', () => {
      component.isMenuOpen.set(true);
      fixture.detectChanges();

      const backdrop = fixture.nativeElement.querySelector('.fixed.inset-0');
      expect(backdrop).toBeTruthy();

      backdrop.click();
      fixture.detectChanges();

      expect(component.isMenuOpen()).toBe(false);
    });
  });

  describe('language switching', () => {
    beforeEach(() => {
      component.isMenuOpen.set(true);
      fixture.detectChanges();
    });

    it('should change language to English and close menu', () => {
      const spyUse = vi.spyOn(translateService, 'use');

      // Find the English (EN) button
      const buttons = fixture.nativeElement.querySelectorAll('.grid button');
      // The buttons in template: ES is first, EN is second
      const enButton = buttons[1];
      expect(enButton.textContent.trim()).toBe('EN');

      enButton.click();
      fixture.detectChanges();

      expect(spyUse).toHaveBeenCalledWith('en');
      expect(component.currentLang()).toBe('en');
      expect(component.isMenuOpen()).toBe(false);
    });

    it('should change language to Spanish and close menu', () => {
      const spyUse = vi.spyOn(translateService, 'use');

      // Set initial to English
      component.currentLang.set('en');
      fixture.detectChanges();

      // Find the Spanish (ES) button
      const buttons = fixture.nativeElement.querySelectorAll('.grid button');
      const esButton = buttons[0];
      expect(esButton.textContent.trim()).toBe('ES');

      esButton.click();
      fixture.detectChanges();

      expect(spyUse).toHaveBeenCalledWith('es');
      expect(component.currentLang()).toBe('es');
      expect(component.isMenuOpen()).toBe(false);
    });
  });

  describe('menu actions', () => {
    beforeEach(() => {
      component.isMenuOpen.set(true);
      fixture.detectChanges();
    });

    it('should have a link to /bars/select that closes the menu when clicked', () => {
      const link = fixture.nativeElement.querySelector('a[routerLink="/bars/select"]');
      expect(link).toBeTruthy();

      const spyClose = vi.spyOn(component, 'closeMenu');

      component.closeMenu();
      fixture.detectChanges();

      expect(spyClose).toHaveBeenCalled();
      expect(component.isMenuOpen()).toBe(false);
    });

    it('should log out, close menu, and navigate to /login when logout button is clicked', async () => {
      const logoutBtn = fixture.nativeElement.querySelector('button.text-error');
      expect(logoutBtn).toBeTruthy();

      await component.logout();
      fixture.detectChanges();

      expect(authMock.logout).toHaveBeenCalled();
      expect(component.isMenuOpen()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    });
  });
});
