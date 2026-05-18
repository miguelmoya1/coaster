import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MembersStore } from '@coaster/members';
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [provideTranslateService(), provideRouter([]), { provide: MembersStore, useValue: membersStoreMock }],
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
