import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ExportTimesheetForm } from './export-timesheet-form';

describe('ExportTimesheetForm', () => {
  let fixture: ComponentFixture<ExportTimesheetForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportTimesheetForm],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ExportTimesheetForm);
    fixture.componentRef.setInput('from', '2026-08-01');
    fixture.componentRef.setInput('to', '2026-08-31');
    fixture.detectChanges();
  });

  it('should preload the range it was given', () => {
    const dates = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type="date"]')];

    expect(dates.map((input) => input.value)).toEqual(['2026-08-01', '2026-08-31']);
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
