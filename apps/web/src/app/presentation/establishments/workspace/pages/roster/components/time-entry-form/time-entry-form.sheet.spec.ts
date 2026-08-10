import { createEnvironmentInjector, EnvironmentInjector, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { provideNativeDateAdapter } from '@angular/material/core';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeEntryForm } from './time-entry-form';

describe('TimeEntryForm opened in a bottom sheet', () => {
  let bottomSheet: MatBottomSheet;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        { provide: TimeTrackingStore, useValue: { amend: vi.fn(), createEntry: vi.fn() } },
      ],
    });

    bottomSheet = TestBed.inject(MatBottomSheet);
  });

  it('should blow up without a date adapter, the way it did in the browser', () => {
    expect(() => {
      bottomSheet.open(TimeEntryForm, { data: { workdayDate: '2026-08-08' } });
      TestBed.tick();
    }).toThrow(/DateAdapter/);
  });

  it('should open when handed the page injector, which is where the adapter lives', () => {
    const routeInjector = createEnvironmentInjector([provideNativeDateAdapter()], TestBed.inject(EnvironmentInjector));

    expect(() => {
      bottomSheet.open(TimeEntryForm, { injector: routeInjector });
      TestBed.tick();
    }).not.toThrow();
  });
});
