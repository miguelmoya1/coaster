import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { RosterWeeklyGrid, WeeklyDayItem, WeeklyShiftItem } from './roster-weekly-grid';
import { BarRole, asBarId, asShiftId, asUserId } from '@coaster/common';
import { describe, expect, it, beforeEach } from 'vitest';

describe('RosterWeeklyGrid', () => {
  let component: RosterWeeklyGrid;
  let fixture: ComponentFixture<RosterWeeklyGrid>;

  const mockShift: WeeklyShiftItem = {
    id: asShiftId('shift-1'),
    barId: asBarId('bar-1'),
    userId: asUserId('user-1'),
    startTime: '2026-05-31T08:00:00.000Z',
    endTime: '2026-05-31T16:00:00.000Z',
    timeRange: '08:00 — 16:00',
    roleName: BarRole.STAFF,
    hasPendingExchange: false,
    isOwn: false,
    isPast: false,
    userName: 'John Staff',
    userImage: 'john.jpg',
  };

  const mockWeekDays: WeeklyDayItem[] = [
    {
      date: new Date('2026-05-31T00:00:00.000Z'),
      dayId: '2026-05-31',
      dayName: 'Sun',
      dayNumber: 31,
      shifts: [mockShift],
      isToday: true,
      isActive: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RosterWeeklyGrid],
      providers: [
        provideTranslateService(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterWeeklyGrid);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('currentUserRole', BarRole.STAFF);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the day list and shifts', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('currentUserRole', BarRole.STAFF);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    const dayName = fixture.nativeElement.querySelector('span.bg-primary') as HTMLElement;
    expect(dayName).toBeTruthy();
    expect(dayName.textContent).toContain('Sun');

    const staffName = fixture.nativeElement.querySelector('.text-white.truncate') as HTMLElement;
    expect(staffName).toBeTruthy();
    expect(staffName.textContent).toContain('John Staff');
  });

  it('should not display replicate button or delete button if user is not OWNER', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('currentUserRole', BarRole.STAFF);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    const allButtons = fixture.nativeElement.querySelectorAll('button');
    const deleteBtn = Array.from(allButtons).find((btn) => 
      (btn as HTMLButtonElement).querySelector('ng-icon[name="lucideTrash2"]')
    );
    expect(deleteBtn).toBeUndefined();

    const replicateBtn = Array.from(allButtons).find((btn) => 
      (btn as HTMLButtonElement).textContent?.includes('roster.replication.button')
    );
    expect(replicateBtn).toBeUndefined();
  });

  it('should display replicate button and delete button if user is OWNER', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('currentUserRole', BarRole.OWNER);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should emit events on delete, quickCreate, and replication actions', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('currentUserRole', BarRole.OWNER);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    let deleteEmitted: WeeklyShiftItem | null = null;
    let createEmitted: Date | null = null;
    let replicateEmitted = false;

    component.deleteShift.subscribe((s: WeeklyShiftItem) => { deleteEmitted = s; });
    component.quickCreate.subscribe((d: Date) => { createEmitted = d; });
    component.replicatePreviousWeek.subscribe(() => { replicateEmitted = true; });

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    const deleteBtn = buttons.find(b => b.querySelector('ng-icon[name="lucideTrash2"]')) as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    expect(deleteEmitted).toEqual(mockShift);

    const quickCreateBtn = buttons.find(b => b.querySelector('ng-icon[name="lucidePlus"]')) as HTMLButtonElement;
    expect(quickCreateBtn).toBeTruthy();
    quickCreateBtn.click();
    expect(createEmitted).toBeInstanceOf(Date);

    const replicateBtn = buttons.find(b => b.querySelector('ng-icon[name="lucideCopy"]')) as HTMLButtonElement;
    expect(replicateBtn).toBeTruthy();
    replicateBtn.click();
    expect(replicateEmitted).toBe(true);
  });
});
