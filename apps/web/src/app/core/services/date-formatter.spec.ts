import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { DateFormatterService } from './date-formatter';

describe('DateFormatterService', () => {
  const august15 = new Date('2026-08-15T10:00:00');

  const formatterSpeaking = (language?: string) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideTranslateService(), DateFormatterService],
    });

    if (language) {
      TestBed.inject(TranslateService).use(language);
    }

    return TestBed.inject(DateFormatterService);
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('should write month names in Spanish, the language the product ships in', () => {
    const formatter = formatterSpeaking('es');

    expect(formatter.formatShortDate(august15)).toBe('15 ago');
    expect(formatter.formatMonthYear(august15)).toBe('AGOSTO 2026');
  });

  it('should follow the worker language when it is English', () => {
    const formatter = formatterSpeaking('en');

    expect(formatter.formatShortDate(august15)).toBe('15 Aug');
    expect(formatter.formatMonthYear(august15)).toBe('AUGUST 2026');
  });

  it('should fall back to Spanish rather than English when no language has been chosen', () => {
    const formatter = formatterSpeaking();

    expect(formatter.formatShortDate(august15)).toBe('15 ago');
  });

  it('should still work where nothing provides a translate service', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection(), DateFormatterService] });

    expect(TestBed.inject(DateFormatterService).formatShortDate(august15)).toBe('15 ago');
  });

  it('should leave the numeric formats alone, whatever the language', () => {
    const spanish = formatterSpeaking('es');
    const english = formatterSpeaking('en');

    expect(spanish.formatDayId(august15)).toBe(english.formatDayId(august15));
    expect(spanish.formatDuration(125)).toBe('2h 05m');
  });
});
