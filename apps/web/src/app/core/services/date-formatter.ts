import { inject, Service } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { format, type Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';

const LOCALES: Record<string, Locale> = { es, en: enUS };

@Service()
export class DateFormatterService {
  readonly #translate = inject(TranslateService, { optional: true });

  get #locale(): Locale {
    return LOCALES[this.#translate?.getCurrentLang() ?? ''] ?? es;
  }

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
    return format(new Date(iso), 'MMM', { locale: this.#locale }).toUpperCase();
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
    return format(date, 'EEE', { locale: this.#locale });
  }

  public formatMonthYear(date: Date): string {
    return format(date, 'MMMM yyyy', { locale: this.#locale }).toUpperCase();
  }

  public formatShortDate(date: Date): string {
    return format(date, 'd MMM', { locale: this.#locale });
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
