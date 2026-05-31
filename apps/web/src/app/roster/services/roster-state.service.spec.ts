import { TestBed } from '@angular/core/testing';
import { DateFormatterService } from '../../core/services/date-formatter';
import { RosterStateService } from './roster-state.service';
import { describe, expect, it, beforeEach } from 'vitest';

describe('RosterStateService', () => {
  let service: RosterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DateFormatterService,
        RosterStateService,
      ],
    });
    service = TestBed.inject(RosterStateService);
  });

  it('should initialize with default selectedDate as today and viewMode as day', () => {
    expect(service.selectedDate()).toBeInstanceOf(Date);
    expect(service.viewMode()).toBe('day');
  });

  it('should update viewMode when setViewMode is called', () => {
    service.setViewMode('week');
    expect(service.viewMode()).toBe('week');

    service.setViewMode('month');
    expect(service.viewMode()).toBe('month');
  });

  it('should update selectedDate when setDate is called', () => {
    const testDate = new Date(2026, 4, 15); // May 15, 2026
    service.setDate(testDate);
    expect(service.selectedDate().getFullYear()).toBe(2026);
    expect(service.selectedDate().getMonth()).toBe(4);
    expect(service.selectedDate().getDate()).toBe(15);
  });

  it('should calculate next and prev dates correctly in day view', () => {
    const baseDate = new Date(2026, 4, 15);
    service.setDate(baseDate);
    service.setViewMode('day');

    const next = service.calculateNext();
    expect(next.getDate()).toBe(16);

    const prev = service.calculatePrev();
    expect(prev.getDate()).toBe(14);
  });

  it('should calculate next and prev dates correctly in week view', () => {
    const baseDate = new Date(2026, 4, 15);
    service.setDate(baseDate);
    service.setViewMode('week');

    const next = service.calculateNext();
    expect(next.getDate()).toBe(22); // +7 days

    const prev = service.calculatePrev();
    expect(prev.getDate()).toBe(8); // -7 days
  });

  it('should calculate next and prev dates correctly in month view', () => {
    const baseDate = new Date(2026, 4, 15);
    service.setDate(baseDate);
    service.setViewMode('month');

    const next = service.calculateNext();
    expect(next.getMonth()).toBe(5); // June

    const prev = service.calculatePrev();
    expect(prev.getMonth()).toBe(3); // April
  });

  it('should generate scrollerDays correctly centered around selected date', () => {
    const baseDate = new Date(2026, 4, 15);
    service.setDate(baseDate);

    const days = service.scrollerDays();
    expect(days.length).toBe(15);
    // Center element (index 7) should be the selected date
    expect(days[7].isActive).toBe(true);
    expect(days[7].dayNumber).toBe(15);
  });

  it('should generate activeWeekDays correctly start of week monday', () => {
    const baseDate = new Date(2026, 4, 14); // May 14, 2026 is a Thursday
    service.setDate(baseDate);

    const weekDays = service.activeWeekDays();
    expect(weekDays.length).toBe(7);
    // Start of week should be Monday May 11
    expect(weekDays[0].getDate()).toBe(11);
  });

  it('should generate calendarMonthDays correctly including padding days', () => {
    const baseDate = new Date(2026, 4, 15); // May 15, 2026
    service.setDate(baseDate);

    const monthDays = service.calendarMonthDays();
    expect(monthDays.length).toBeGreaterThanOrEqual(28);
    // May 15 should be active
    const activeDay = monthDays.find(d => d.isActive);
    expect(activeDay).toBeDefined();
    expect(activeDay?.dayNumber).toBe(15);
  });
});
