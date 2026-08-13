import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExportTimesheetForm } from './export-timesheet-form';

describe('ExportTimesheetForm', () => {
  let fixture: ComponentFixture<ExportTimesheetForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportTimesheetForm],
      providers: [provideZonelessChangeDetection(), provideTranslateService(), provideNativeDateAdapter()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportTimesheetForm);
    fixture.componentRef.setInput('from', '2026-08-01');
    fixture.componentRef.setInput('to', '2026-08-31');
    fixture.detectChanges();
  });

  it('should offer a button that opens the calendar', () => {
    const toggle = (fixture.nativeElement as HTMLElement).querySelector('mat-datepicker-toggle button');

    expect(toggle).not.toBeNull();
  });

  it('should preload the range it was given', () => {
    const shown = [...(fixture.nativeElement as HTMLElement).querySelectorAll('.mat-date-range-input-mirror')].map(
      (mirror) => {
        const date = new Date(mirror.textContent!.trim());
        return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
      },
    );

    expect(shown).toEqual([
      [2026, 8, 1],
      [2026, 8, 31],
    ]);
  });

  it('should emit the picked range in the format the API expects', () => {
    let emitted: { from: string; to: string } | undefined;
    fixture.componentInstance.confirmed.subscribe((range) => (emitted = range));

    const confirm = (fixture.nativeElement as HTMLElement).querySelectorAll('button')[
      (fixture.nativeElement as HTMLElement).querySelectorAll('button').length - 1
    ];
    confirm.click();

    expect(emitted).toEqual({ from: '2026-08-01', to: '2026-08-31' });
  });
});
