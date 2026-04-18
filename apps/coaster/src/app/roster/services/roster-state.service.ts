import { Injectable, computed, inject, signal } from '@angular/core';
import { addDays, isSameDay, subDays } from 'date-fns';
import { DateFormatterService } from '../../core';
import { ScrollerDay } from '../../shifts';

const TOTAL_DAYS = 15;

@Injectable()
export class RosterStateService {
  private readonly dateFormatter = inject(DateFormatterService);

  public readonly selectedDate = signal<Date>(new Date());

  public readonly scrollerDays = computed<(ScrollerDay & { dateObj: Date })[]>(() => {
    const start = subDays(new Date(), 1);
    const currentSelected = this.selectedDate();

    return Array.from({ length: TOTAL_DAYS }).map((_, i) => {
      const date = addDays(start, i);
      return {
        id: this.dateFormatter.formatDayId(date),
        dayName: this.dateFormatter.formatDayName(date),
        dayNumber: date.getDate(),
        isActive: isSameDay(date, currentSelected),
        dateObj: date,
      };
    });
  });

  public readonly dailyShiftsRange = computed(() => {
    const selected = new Date(this.selectedDate());
    const startIso = new Date(selected.setHours(0, 0, 0, 0)).toISOString();
    const endIso = new Date(selected.setHours(23, 59, 59, 999)).toISOString();
    return { startIso, endIso };
  });

  public readonly displayMonthYear = computed(() => {
    return this.dateFormatter.formatMonthYear(this.selectedDate());
  });

  public readonly displayToday = computed(() => {
    return this.dateFormatter.formatShortDate(new Date());
  });

  public selectDay(dayId: string) {
    const day = this.scrollerDays().find((d) => d.id === dayId);
    if (day) {
      this.selectedDate.set(day.dateObj);
    }
  }
}
