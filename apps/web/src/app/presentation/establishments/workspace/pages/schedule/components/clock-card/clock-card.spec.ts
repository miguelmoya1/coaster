import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClockState, TimeEntryType } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { ClockCard } from './clock-card';

describe('ClockCard', () => {
  let fixture: ComponentFixture<ClockCard>;

  const render = (state: ClockState) => {
    fixture.componentRef.setInput('state', state);
    fixture.componentRef.setInput('workedMinutes', 125);
    fixture.componentRef.setInput('breakMinutes', 20);
    fixture.detectChanges();
  };

  const buttonLabels = () =>
    Array.from(fixture.nativeElement.querySelectorAll('button')).map((button) => {
      const withoutIcon = (button as HTMLButtonElement).cloneNode(true) as HTMLElement;
      withoutIcon.querySelector('mat-icon')?.remove();

      return withoutIcon.textContent?.trim();
    });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClockCard],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ClockCard);
  });

  it('should offer only the clock in while the shift has not started', () => {
    render(ClockState.OUT);

    expect(buttonLabels()).toEqual(['schedule.time_tracking.clock_in']);
  });

  it('should offer break and clock out while working', () => {
    render(ClockState.IN);

    expect(buttonLabels()).toEqual(['schedule.time_tracking.break_start', 'schedule.time_tracking.clock_out']);
  });

  it('should offer resuming and clocking out while on a break', () => {
    render(ClockState.ON_BREAK);

    expect(buttonLabels()).toEqual(['schedule.time_tracking.break_end', 'schedule.time_tracking.clock_out']);
  });

  it('should show worked and break time in hours and minutes', () => {
    render(ClockState.IN);

    expect(fixture.nativeElement.textContent).toContain('2h 05m');
    expect(fixture.nativeElement.textContent).toContain('0h 20m');
  });

  it('should emit the punch the employee asked for', () => {
    render(ClockState.IN);

    let emitted: TimeEntryType | undefined;
    fixture.componentInstance.clock.subscribe((type) => (emitted = type));

    const [breakButton] = fixture.nativeElement.querySelectorAll('button');
    (breakButton as HTMLButtonElement).click();

    expect(emitted).toBe(TimeEntryType.BREAK_START);
  });

  it('should say nothing about other days when the open one is today', () => {
    render(ClockState.IN);

    expect(fixture.nativeElement.textContent).not.toContain('schedule.time_tracking.unclosed_workday');
  });

  it('should flag a day nobody closed without taking away the punch for today', () => {
    fixture.componentRef.setInput('state', ClockState.OUT);
    fixture.componentRef.setInput('unclosedOn', '14 ago');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'schedule.time_tracking.unclosed_workday',
    );
    expect(buttonLabels()).toEqual(['schedule.time_tracking.clock_in']);
  });

  it('should block every action while a punch is in flight', () => {
    fixture.componentRef.setInput('state', ClockState.IN);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    expect(buttons.every((button) => button.disabled)).toBe(true);
  });
});
