import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import { EstablishmentId } from '@coaster/common';
import { StatsStore } from '@coaster/stats';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodayTakingsWidget } from './today-takings-widget';

const baseStats = {
  todayRevenue: 0,
  yesterdayRevenue: 0,
  sameWeekdayLastWeekRevenue: 0,
  weeklyRevenue: 0,
  dailyRevenues: [],
  todayTicketCount: 0,
  todayAverageTicket: 0,
  todayCashRevenue: 0,
  todayCardRevenue: 0,
  todayTipAmount: 0,
  history: null,
};

const statsValue = signal({ ...baseStats });

const statsStoreMock = {
  stats: {
    value: () => statsValue(),
    isLoading: () => false,
    hasValue: () => true,
  },
  setEstablishmentId: vi.fn(),
};

describe('TodayTakingsWidget', () => {
  let fixture: ComponentFixture<TodayTakingsWidget>;

  const withStats = (stats: Partial<typeof baseStats>) => {
    statsValue.set({ ...baseStats, ...stats });
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    statsValue.set({ ...baseStats });

    await TestBed.configureTestingModule({
      imports: [TodayTakingsWidget],
      providers: [
        provideTranslateService(),
        { provide: StatsStore, useValue: statsStoreMock },
        {
          provide: CurrentEstablishmentStore,
          useValue: { currentId: signal<EstablishmentId | undefined>('establishment-1' as EstablishmentId) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TodayTakingsWidget);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
  });

  describe('against yesterday', () => {
    it('should call a better day better, and say by how much', () => {
      const widget = withStats({ todayRevenue: 12000, yesterdayRevenue: 10000 });

      expect(widget.vsYesterday()).toEqual({ percent: 20, isPositive: true, hasBaseline: true });
    });

    it('should call a worse day worse', () => {
      const widget = withStats({ todayRevenue: 8000, yesterdayRevenue: 10000 });

      expect(widget.vsYesterday()).toEqual({ percent: 20, isPositive: false, hasBaseline: true });
    });

    it('should not invent a percentage when yesterday took nothing', () => {
      const widget = withStats({ todayRevenue: 5000, yesterdayRevenue: 0 });

      expect(widget.vsYesterday()?.hasBaseline).toBe(false);
      expect(widget.vsYesterday()?.percent).toBe(0);
    });

    it('should read a flat day as no change rather than a fall', () => {
      const widget = withStats({ todayRevenue: 10000, yesterdayRevenue: 10000 });

      expect(widget.vsYesterday()).toEqual({ percent: 0, isPositive: true, hasBaseline: true });
    });
  });

  describe('against the same weekday last week', () => {
    it('should compare a Thursday against a Thursday, not against yesterday', () => {
      const widget = withStats({ todayRevenue: 10000, yesterdayRevenue: 1, sameWeekdayLastWeekRevenue: 8000 });

      expect(widget.vsLastWeek()).toEqual({ percent: 25, isPositive: true, hasBaseline: true });
    });

    it('should stay quiet when there is no matching day to compare against', () => {
      const widget = withStats({ todayRevenue: 10000, sameWeekdayLastWeekRevenue: 0 });

      expect(widget.vsLastWeek()?.hasBaseline).toBe(false);
    });
  });
});
