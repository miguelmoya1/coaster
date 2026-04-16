import { Injectable, computed, signal } from '@angular/core';
import { addDays, format, isSameDay, startOfWeek } from 'date-fns';
import { ScrollerDay } from '../../shifts';

@Injectable()
export class RosterStateService {
  public readonly selectedDate = signal<Date>(new Date());

  public readonly weekStart = computed(() => startOfWeek(this.selectedDate(), { weekStartsOn: 1 }));

  public readonly scrollerDays = computed<(ScrollerDay & { dateObj: Date })[]>(() => {
    const start = this.weekStart();
    const currentSelected = this.selectedDate();

    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(start, i);
      return {
        dayName: format(date, 'EEE'),
        dayNumber: date.getDate(),
        isActive: isSameDay(date, currentSelected),
        dateObj: date,
      };
    });
  });

  public readonly dailyShiftsRange = computed(() => {
    const selected = this.selectedDate();
    const startIso = new Date(selected.setHours(0, 0, 0, 0)).toISOString();
    const endIso = new Date(selected.setHours(23, 59, 59, 999)).toISOString();
    return { startIso, endIso };
  });

  public readonly displayMonthYear = computed(() => {
    return format(this.selectedDate(), 'MMMM yyyy').toUpperCase();
  });

  public readonly displayToday = computed(() => {
    return format(new Date(), 'MMM d');
  });

  public selectDay(dayNumber: number) {
    const day = this.scrollerDays().find((d) => d.dayNumber === dayNumber);
    if (day) {
      this.selectedDate.set(day.dateObj);
    }
  }
}
