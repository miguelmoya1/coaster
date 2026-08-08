import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarRole, asBarId, asShiftId, asUserId } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { RosterWeeklyGrid, WeeklyDayItem, WeeklyShiftItem } from './roster-weekly-grid';

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
      providers: [provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(RosterWeeklyGrid);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('canCreateShift', false);
    fixture.componentRef.setInput('canDeleteShift', false);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render the day list and shifts', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('canCreateShift', false);
    fixture.componentRef.setInput('canDeleteShift', false);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    const dayName = fixture.nativeElement.querySelector('span.bg-primary') as HTMLElement;
    expect(dayName).toBeTruthy();
    expect(dayName.textContent).toContain('Sun');

    const staffName = fixture.nativeElement.querySelector('.text-white.truncate') as HTMLElement;
    expect(staffName).toBeTruthy();
    expect(staffName.textContent).toContain('John Staff');
  });

  it('should hide the replicate and delete buttons from whoever cannot manage shifts', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('canCreateShift', false);
    fixture.componentRef.setInput('canDeleteShift', false);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    const allButtons = fixture.nativeElement.querySelectorAll('button');
    const deleteBtn = Array.from(allButtons).find((btn) => {
      const icon = (btn as HTMLButtonElement).querySelector('mat-icon');
      return icon && icon.textContent?.trim() === 'delete';
    });
    expect(deleteBtn).toBeUndefined();

    const replicateBtn = Array.from(allButtons).find((btn) =>
      (btn as HTMLButtonElement).textContent?.includes('roster.replication.button'),
    );
    expect(replicateBtn).toBeUndefined();
  });

  it('should show the replicate and delete buttons to whoever can manage shifts', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('canCreateShift', true);
    fixture.componentRef.setInput('canDeleteShift', true);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('should emit events on delete, quickCreate, and replication actions', () => {
    fixture.componentRef.setInput('weekDays', mockWeekDays);
    fixture.componentRef.setInput('canCreateShift', true);
    fixture.componentRef.setInput('canDeleteShift', true);
    fixture.componentRef.setInput('isSubmitting', false);
    fixture.detectChanges();

    let deleteEmitted: WeeklyShiftItem | null = null;
    let createEmitted: Date | null = null;
    let replicateEmitted = false;

    component.deleteShift.subscribe((s: WeeklyShiftItem) => {
      deleteEmitted = s;
    });
    component.quickCreate.subscribe((d: Date) => {
      createEmitted = d;
    });
    component.replicatePreviousWeek.subscribe(() => {
      replicateEmitted = true;
    });

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];

    const deleteBtn = buttons.find(
      (b) => b.querySelector('mat-icon')?.textContent?.trim() === 'delete',
    ) as HTMLButtonElement;
    expect(deleteBtn).toBeTruthy();
    deleteBtn.click();
    expect(deleteEmitted).toEqual(mockShift);

    const quickCreateBtn = buttons.find(
      (b) => b.querySelector('mat-icon')?.textContent?.trim() === 'add',
    ) as HTMLButtonElement;
    expect(quickCreateBtn).toBeTruthy();
    quickCreateBtn.click();
    expect(createEmitted).toBeInstanceOf(Date);

    const replicateBtn = buttons.find(
      (b) => b.querySelector('mat-icon')?.textContent?.trim() === 'content_copy',
    ) as HTMLButtonElement;
    expect(replicateBtn).toBeTruthy();
    replicateBtn.click();
    expect(replicateEmitted).toBe(true);
  });
});
