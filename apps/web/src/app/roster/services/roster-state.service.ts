import { Injectable, computed, inject, signal } from '@angular/core';
import { DateFormatterService } from '@coaster/core';
import {
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

export interface ScrollerDay {
  id: string;
  dayName: string;
  dayNumber: number;
  monthLabel?: string;
  isActive: boolean;
}
const TOTAL_DAYS = 15;

@Injectable()
export class RosterStateService {
  readonly #dateFormatter = inject(DateFormatterService);

  readonly selectedDate = signal<Date>(new Date());
  readonly viewMode = signal<'day' | 'week' | 'month'>('day');

  readonly scrollerDays = computed<(ScrollerDay & { dateObj: Date })[]>(() => {
    const currentSelected = this.selectedDate();
    // Center the 15-day range around the selected date
    const start = subDays(currentSelected, 7);

    return Array.from({ length: TOTAL_DAYS }).map((_, i) => {
      const date = addDays(start, i);
      return {
        id: this.#dateFormatter.formatDayId(date),
        dayName: this.#dateFormatter.formatDayName(date),
        dayNumber: date.getDate(),
        isActive: isSameDay(date, currentSelected),
        dateObj: date,
      };
    });
  });

  readonly activeWeekDays = computed<Date[]>(() => {
    const selected = this.selectedDate();
    const start = startOfWeek(selected, { weekStartsOn: 1 });
    const end = endOfWeek(selected, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  });

  readonly calendarMonthDays = computed(() => {
    const selected = this.selectedDate();
    const startM = startOfMonth(selected);
    const endM = endOfMonth(selected);
    const gridStart = startOfWeek(startM, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endM, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return days.map((date) => {
      return {
        date,
        id: this.#dateFormatter.formatDayId(date),
        dayNumber: date.getDate(),
        isCurrentMonth: date.getMonth() === selected.getMonth(),
        isActive: isSameDay(date, selected),
      };
    });
  });

  readonly dailyShiftsRange = computed(() => {
    const selected = this.selectedDate();
    const view = this.viewMode();

    if (view === 'month') {
      const start = startOfMonth(selected);
      const end = endOfMonth(selected);
      const startLocal = new Date(start);
      startLocal.setHours(0, 0, 0, 0);
      const endLocal = new Date(end);
      endLocal.setHours(23, 59, 59, 999);
      return {
        startIso: startLocal.toISOString(),
        endIso: endLocal.toISOString(),
      };
    } else {
      // For Day or Week view, query the entire active week
      const start = startOfWeek(selected, { weekStartsOn: 1 });
      const end = endOfWeek(selected, { weekStartsOn: 1 });
      const startLocal = new Date(start);
      startLocal.setHours(0, 0, 0, 0);
      const endLocal = new Date(end);
      endLocal.setHours(23, 59, 59, 999);
      return {
        startIso: startLocal.toISOString(),
        endIso: endLocal.toISOString(),
      };
    }
  });

  readonly displayMonthYear = computed(() => {
    return this.#dateFormatter.formatMonthYear(this.selectedDate());
  });

  readonly displayToday = computed(() => {
    return this.#dateFormatter.formatShortDate(new Date());
  });

  public setDate(date: Date) {
    const current = this.selectedDate();
    if (
      current.getFullYear() !== date.getFullYear() ||
      current.getMonth() !== date.getMonth() ||
      current.getDate() !== date.getDate()
    ) {
      this.selectedDate.set(date);
    }
  }

  public setViewMode(view: 'day' | 'week' | 'month') {
    if (this.viewMode() !== view) {
      this.viewMode.set(view);
    }
  }

  calculateNext(): Date {
    const selected = this.selectedDate();
    const view = this.viewMode();

    if (view === 'day') {
      return addDays(selected, 1);
    } else if (view === 'week') {
      return addWeeks(selected, 1);
    } else {
      return addMonths(selected, 1);
    }
  }

  calculatePrev(): Date {
    const selected = this.selectedDate();
    const view = this.viewMode();

    if (view === 'day') {
      return subDays(selected, 1);
    } else if (view === 'week') {
      return subWeeks(selected, 1);
    } else {
      return subMonths(selected, 1);
    }
  }
}

