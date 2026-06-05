import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { RosterMonthlyGrid, MonthlyDayItem, MonthlyShiftItem } from './roster-monthly-grid';
import { asShiftId } from '@coaster/core';
import { describe, expect, it, beforeEach } from 'vitest';

describe('RosterMonthlyGrid', () => {
  let component: RosterMonthlyGrid;
  let fixture: ComponentFixture<RosterMonthlyGrid>;

  const mockShift: MonthlyShiftItem = {
    id: asShiftId('shift-1'),
    userName: 'John Doe',
    isOwn: false,
    hasPendingExchange: false,
  };

  const mockCalendarDays: MonthlyDayItem[] = [
    {
      date: new Date('2026-05-01T00:00:00.000Z'),
      id: '2026-05-01',
      dayNumber: 1,
      isCurrentMonth: true,
      isActive: false,
      shifts: [mockShift],
    },
    {
      date: new Date('2026-05-02T00:00:00.000Z'),
      id: '2026-05-02',
      dayNumber: 2,
      isCurrentMonth: true,
      isActive: true,
      shifts: [],
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterMonthlyGrid],
      providers: [
        provideTranslateService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterMonthlyGrid);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('calendarDays', mockCalendarDays);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render correct day number and shifts list', () => {
    fixture.componentRef.setInput('calendarDays', mockCalendarDays);
    fixture.detectChanges();

    const dayNumberSpan = fixture.nativeElement.querySelector('span.self-end.text-white') as HTMLElement;
    expect(dayNumberSpan).toBeTruthy();
    expect(dayNumberSpan.textContent).toContain('1');

    const activeDayNumberSpan = fixture.nativeElement.querySelector('span.self-end.bg-primary') as HTMLElement;
    expect(activeDayNumberSpan).toBeTruthy();
    expect(activeDayNumberSpan.textContent).toContain('2');
  });

  it('should have accessibility properties (role, tabindex) on day cells', () => {
    fixture.componentRef.setInput('calendarDays', mockCalendarDays);
    fixture.detectChanges();

    const dayCells = fixture.nativeElement.querySelectorAll('div[role="button"]');
    expect(dayCells.length).toBe(2);

    const cell = dayCells[0] as HTMLDivElement;
    expect(cell.getAttribute('tabindex')).toBe('0');
  });

  it('should emit daySelected on click, enter keydown, and space keydown', () => {
    fixture.componentRef.setInput('calendarDays', mockCalendarDays);
    fixture.detectChanges();

    let emittedId: string | null = null;
    component.daySelected.subscribe((id: string) => { emittedId = id; });

    const dayCells = fixture.nativeElement.querySelectorAll('div[role="button"]');
    const cell1 = dayCells[0] as HTMLDivElement;

    cell1.click();
    expect(emittedId).toBe('2026-05-01');

    emittedId = null;

    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
    cell1.dispatchEvent(enterEvent);
    expect(emittedId).toBe('2026-05-01');

    emittedId = null;

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    cell1.dispatchEvent(spaceEvent);
    expect(emittedId).toBe('2026-05-01');
  });
});
