import { Service } from '@angular/core';
import { format } from 'date-fns';

@Service()
export class DateFormatterService {
  public formatTimeRange(startIso: string, endIso: string): string {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      return `${format(start, 'HH:mm')} — ${format(end, 'HH:mm')}`;
    } catch {
      return '';
    }
  }

  public formatMonth(iso: string): string {
    return format(new Date(iso), 'MMM').toUpperCase();
  }

  public formatDay(iso: string): string {
    return format(new Date(iso), 'd');
  }

  public formatShiftPeriod(iso: string): 'morning' | 'afternoon' | 'evening' {
    const hour = new Date(iso).getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  public formatDayId(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  public formatDayName(date: Date): string {
    return format(date, 'EEE');
  }

  public formatMonthYear(date: Date): string {
    return format(date, 'MMMM yyyy').toUpperCase();
  }

  public formatShortDate(date: Date): string {
    return format(date, 'MMM d');
  }

  public formatTime(iso: string): string {
    return format(new Date(iso), 'HH:mm');
  }

  public formatDuration(minutes: number): string {
    const safe = Math.max(0, minutes);
    return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, '0')}m`;
  }

  public buildIso(date: Date, timeString: string): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result.toISOString();
  }
}
