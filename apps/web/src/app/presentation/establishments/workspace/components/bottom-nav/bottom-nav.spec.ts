import { signal } from '@angular/core';
import { EstablishmentPermission, EstablishmentRole, hasPermission } from '@coaster/common';
import { ModulesStore } from '@coaster/establishments';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideChildTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BottomBar } from '../bottom-bar/bottom-bar';
import { BottomNav } from './bottom-nav';
import { MyMemberStore } from '@coaster/establishment-members';

const modulesStoreMock = {
  currentEstablishmentId: signal(undefined).asReadonly(),
  settings: { isLoading: signal(false).asReadonly() },
  setEstablishmentId: vi.fn(),
  isModuleEnabled: vi.fn((): boolean => true),
};

describe('BottomNav', () => {
  let component: BottomNav;
  let fixture: ComponentFixture<BottomNav>;

  const myMemberStoreMock = {
    hasPermission: vi.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BottomNav],
      providers: [
        provideRouter([]),
        provideChildTranslateService(),
        { provide: MyMemberStore, useValue: myMemberStoreMock },
        { provide: ModulesStore, useValue: modulesStoreMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('the room it leaves for the add button', () => {
    const nav = (): HTMLElement => fixture.nativeElement.querySelector('nav');

    it('should span the whole bar when the page has no add button', () => {
      expect(nav().style.width).toBe('var(--bottom-bar-width)');
    });

    it('should shrink by exactly the button and the gap when the page has one', async () => {
      TestBed.inject(BottomBar).registerFab();
      await fixture.whenStable();

      expect(nav().style.width).toBe(
        'calc(var(--bottom-bar-width) - var(--bottom-fab-size) - var(--bottom-bar-gap))',
      );
    });

    it('should take the width back when the page with the button is left', async () => {
      const unregister = TestBed.inject(BottomBar).registerFab();
      await fixture.whenStable();
      unregister();
      await fixture.whenStable();

      expect(nav().style.width).toBe('var(--bottom-bar-width)');
    });

    it('should stay shrunk while two pages overlap during a route change', async () => {
      const bar = TestBed.inject(BottomBar);
      const leaveFirst = bar.registerFab();
      bar.registerFab();
      leaveFirst();
      await fixture.whenStable();

      expect(bar.hasFab()).toBe(true);
    });
  });

  describe('the icons', () => {
    it('should name every icon for a screen reader, since the labels are gone', () => {
      const links: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('a'));

      expect(links.length).toBeGreaterThan(0);
      expect(links.every((link) => (link.getAttribute('aria-label') ?? '').length > 0)).toBe(true);
    });
  });

  const renderedSections = () =>
    Array.from(fixture.nativeElement.querySelectorAll('a')).map((a) =>
      ((a as HTMLAnchorElement).getAttribute('href') ?? '').split('/').pop(),
    );

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show every section for an establishment running everything', () => {
    expect(renderedSections()).toEqual(['dashboard', 'orders', 'schedule', 'inventory', 'staff']);
  });

  it('should leave an establishment with only time tracking three sections', () => {
    modulesStoreMock.isModuleEnabled.mockImplementation(() => false);

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.detectChanges();

    expect(renderedSections()).toEqual(['dashboard', 'schedule', 'staff']);
  });

  it('should give a floor staff member the dashboard alongside the sections they work in', () => {
    modulesStoreMock.isModuleEnabled.mockImplementation(() => true);
    myMemberStoreMock.hasPermission.mockImplementation((permission: EstablishmentPermission) =>
      hasPermission(EstablishmentRole.STAFF, permission),
    );

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.detectChanges();

    expect(renderedSections()).toContain('dashboard');
  });
});
