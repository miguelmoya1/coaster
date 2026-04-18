import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';

@Injectable({
  providedIn: 'root',
})
export class DateFormatterService {
  private readonly translate = inject(TranslateService);

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

  public formatShiftPeriod(iso: string): string {
    const hour = new Date(iso).getHours();
    if (hour < 12) return this.translate.instant('roster.exchanges.period_morning');
    if (hour < 18) return this.translate.instant('roster.exchanges.period_afternoon');
    return this.translate.instant('roster.exchanges.period_evening');
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

  public buildIso(date: Date, timeString: string): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result.toISOString();
  }
}
