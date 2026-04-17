import { Injectable, computed, signal } from '@angular/core';
import { addDays, format, isSameDay, subDays } from 'date-fns';
import { ScrollerDay } from '../../shifts';

const TOTAL_DAYS = 15;

@Injectable()
export class RosterStateService {
  public readonly selectedDate = signal<Date>(new Date());

  public readonly scrollerDays = computed<(ScrollerDay & { dateObj: Date })[]>(() => {
    const start = subDays(new Date(), 1);
    const currentSelected = this.selectedDate();

    return Array.from({ length: TOTAL_DAYS }).map((_, i) => {
      const date = addDays(start, i);
      return {
        id: format(date, 'yyyy-MM-dd'),
        dayName: format(date, 'EEE'),
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
    return format(this.selectedDate(), 'MMMM yyyy').toUpperCase();
  });

  public readonly displayToday = computed(() => {
    return format(new Date(), 'MMM d');
  });

  public selectDay(dayId: string) {
    const day = this.scrollerDays().find((d) => d.id === dayId);
    if (day) {
      this.selectedDate.set(day.dateObj);
    }
  }
}
