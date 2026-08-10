import { signal } from '@angular/core';
import { ModulesStore } from '@coaster/establishments';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideChildTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  const renderedSections = () =>
    Array.from(fixture.nativeElement.querySelectorAll('a')).map((a) =>
      ((a as HTMLAnchorElement).getAttribute('href') ?? '').split('/').pop(),
    );

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show every section for an establishment running everything', () => {
    expect(renderedSections()).toEqual(['dashboard', 'orders', 'schedule', 'pantry', 'staff']);
  });

  it('should leave an establishment with only time tracking three sections', () => {
    modulesStoreMock.isModuleEnabled.mockImplementation(() => false);

    fixture = TestBed.createComponent(BottomNav);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
    fixture.detectChanges();

    expect(renderedSections()).toEqual(['dashboard', 'schedule', 'staff']);
  });
});
