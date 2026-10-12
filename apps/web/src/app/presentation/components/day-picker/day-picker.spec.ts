import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { DayPicker } from './day-picker';

describe('DayPicker', () => {
  let fixture: ComponentFixture<DayPicker>;
  let picked: string[];

  const render = async (date: string, today = '2026-09-29') => {
    fixture = TestBed.createComponent(DayPicker);
    fixture.componentRef.setInput('date', date);
    fixture.componentRef.setInput('today', today);
    fixture.componentInstance.dateChange.subscribe((day) => picked.push(day));
    await fixture.whenStable();
  };

  const button = (testId: string) =>
    fixture.nativeElement.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement;

  beforeEach(async () => {
    picked = [];
    await TestBed.configureTestingModule({
      imports: [DayPicker],
      providers: [provideTranslateService()],
    }).compileComponents();
  });

  it('should step a day back and forth', async () => {
    await render('2026-09-01');

    button('previous-day-btn').click();
    button('next-day-btn').click();

    expect(picked).toEqual(['2026-08-31', '2026-09-02']);
  });

  it('should jump to today and to yesterday', async () => {
    await render('2026-09-01');

    button('today-btn').click();
    button('yesterday-btn').click();

    expect(picked).toEqual(['2026-09-29', '2026-09-28']);
  });

  it('should not step past today', async () => {
    await render('2026-09-29');

    expect(button('next-day-btn').disabled).toBe(true);
  });

  it('should hand back the day picked on the calendar as it reads there', async () => {
    await render('2026-09-01');

    fixture.componentInstance['pick'](new Date(2026, 8, 25));

    expect(picked).toEqual(['2026-09-25']);
  });

  it('should show the day it is given on the calendar', async () => {
    await render('2026-09-05');

    const selected: Date = fixture.componentInstance['selected']();
    expect([selected.getMonth(), selected.getDate()]).toEqual([8, 5]);
  });
});
