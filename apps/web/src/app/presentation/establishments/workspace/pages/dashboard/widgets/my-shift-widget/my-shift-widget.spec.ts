import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ClockState, Workday } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { provideTranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyShiftWidget } from './my-shift-widget';

const today = format(new Date(), 'yyyy-MM-dd');
const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

const workdays = signal<Partial<Workday>[]>([]);

const timeTrackingStoreMock = {
  myWorkdays: {
    value: () => workdays(),
    isLoading: () => false,
    hasValue: () => true,
  },
  setEstablishmentId: vi.fn(),
  setRange: vi.fn(),
  clock: vi.fn().mockResolvedValue(undefined),
};

describe('MyShiftWidget', () => {
  let fixture: ComponentFixture<MyShiftWidget>;

  const withWorkdays = (days: Partial<Workday>[]) => {
    workdays.set(days);
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    workdays.set([]);
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [MyShiftWidget],
      providers: [
        provideTranslateService(),
        provideRouter([]),
        { provide: TimeTrackingStore, useValue: timeTrackingStoreMock },
        { provide: ActionFeedback, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyShiftWidget);
    fixture.componentRef.setInput('establishmentId', 'establishment-1');
  });

  it('should read as clocked out when the day has not started', () => {
    const widget = withWorkdays([]);

    expect(widget.clockState()).toBe(ClockState.OUT);
    expect(widget.clockStateLabelKey()).toBe('schedule.time_tracking.state_out');
  });

  it('should take its state from today, not from another day of the week', () => {
    const widget = withWorkdays([
      { date: tomorrow, state: ClockState.OUT, workedMinutes: 0 },
      { date: today, state: ClockState.IN, workedMinutes: 90 },
    ]);

    expect(widget.clockState()).toBe(ClockState.IN);
    expect(widget.todayWorkedLabel()).toBe('1h 30m');
  });

  it('should label a break as a break', () => {
    const widget = withWorkdays([{ date: today, state: ClockState.ON_BREAK, workedMinutes: 0 }]);

    expect(widget.clockStateLabelKey()).toBe('schedule.time_tracking.state_on_break');
  });

  it('should add up the whole week, not just today', () => {
    const widget = withWorkdays([
      { date: today, state: ClockState.IN, workedMinutes: 125 },
      { date: tomorrow, state: ClockState.OUT, workedMinutes: 60 },
    ]);

    expect(widget.todayWorkedLabel()).toBe('2h 05m');
    expect(widget.weekWorkedLabel()).toBe('3h 05m');
  });

  it('should say nothing about a shift when none is rostered for today', () => {
    const widget = withWorkdays([{ date: today, state: ClockState.OUT, workedMinutes: 0, plannedStart: null }]);

    expect(widget.todayPlannedRange()).toBeNull();
  });

  it('should show the hours a rostered shift runs for', () => {
    const widget = withWorkdays([
      {
        date: today,
        state: ClockState.OUT,
        workedMinutes: 0,
        plannedStart: `${today}T09:00:00`,
        plannedEnd: `${today}T17:30:00`,
      },
    ]);

    expect(widget.todayPlannedRange()).toBe('09:00 — 17:30');
  });

  it('should list what is coming without repeating today', () => {
    const widget = withWorkdays([
      { date: today, state: ClockState.IN, workedMinutes: 0, plannedStart: `${today}T09:00:00`, plannedEnd: `${today}T17:00:00` },
      {
        date: tomorrow,
        state: ClockState.OUT,
        workedMinutes: 0,
        plannedStart: `${tomorrow}T10:00:00`,
        plannedEnd: `${tomorrow}T18:00:00`,
      },
    ]);

    const upcoming = widget.upcoming();

    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].date).toBe(tomorrow);
    expect(upcoming[0].timeRange).toBe('10:00 — 18:00');
  });

  it('should not fire a second clock request while the first is still in flight', async () => {
    const widget = withWorkdays([{ date: today, state: ClockState.OUT, workedMinutes: 0 }]);

    widget.isSubmitting.set(true);
    await widget.clock('CLOCK_IN');

    expect(timeTrackingStoreMock.clock).not.toHaveBeenCalled();
  });
});
