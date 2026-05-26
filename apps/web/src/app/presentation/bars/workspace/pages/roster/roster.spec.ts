import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import { ExchangesStore } from '@coaster/exchanges';
import { MembersStore } from '@coaster/members';
import { ShiftsStore } from '@coaster/shifts';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Roster from './roster';

describe('Roster', () => {
  let component: Roster;
  let fixture: ComponentFixture<Roster>;

  const membersStoreMock = {
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
    reload: vi.fn(),
  };

  const barsStoreMock = {
    myMember: {
      value: vi.fn().mockReturnValue(undefined),
    },
  };

  const exchangesMock = {
    exchanges: {
      value: vi.fn().mockReturnValue([]),
      isLoading: vi.fn().mockReturnValue(false),
      hasValue: vi.fn().mockReturnValue(true),
    },
    setBarId: vi.fn(),
    accept: vi.fn(),
    request: vi.fn(),
    reload: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Roster],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: MembersStore, useValue: membersStoreMock },
        { provide: ShiftsStore, useValue: shiftsStoreMock },
        { provide: BarsStore, useValue: barsStoreMock },
        { provide: ExchangesStore, useValue: exchangesMock },
      ],
    }).compileComponents();

    vi.clearAllMocks();

    fixture = TestBed.createComponent(Roster);
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

  describe('rendering', () => {
    it('should render the title', () => {
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('[coaster-title]');
      expect(title).toBeTruthy();
    });

    it('should render the horizontal date scroller', () => {
      fixture.detectChanges();
      const scroller = fixture.nativeElement.querySelector('coaster-horizontal-date-scroller');
      expect(scroller).toBeTruthy();
    });

    it('should render daily assignments heading', () => {
      fixture.detectChanges();
      const headings = fixture.nativeElement.querySelectorAll('[coaster-title]');
      expect(headings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('computed properties', () => {
    it('should return empty daily shifts when no shifts', () => {
      expect(component.dailyShifts()).toEqual([]);
    });

    it('should return empty pending exchanges list when no exchanges', () => {
      expect(component.pendingExchangesList()).toEqual([]);
    });

    it('should return undefined currentUserRole when no matching member', () => {
      expect(component.currentUserRole()).toBeUndefined();
    });

    it('should return empty pending shift ids set', () => {
      expect(component.pendingShiftIds().size).toBe(0);
    });
  });
});
