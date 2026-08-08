import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TimeEntry, Workday } from '@coaster/common';
import {
  asBarId,
  asTimeEntryId,
  asUserId,
  ClockState,
  TimeEntryAction,
  TimeEntrySource,
  TimeEntryType,
} from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { WorkdayCard } from './workday-card';

const entry = (overrides: Partial<TimeEntry> = {}): TimeEntry =>
  ({
    id: asTimeEntryId('entry-1'),
    rootId: asTimeEntryId('entry-1'),
    barId: asBarId('bar-1'),
    userId: asUserId('user-1'),
    userName: 'Luis',
    type: TimeEntryType.CLOCK_IN,
    occurredAt: '2026-08-08T06:00:00.000Z',
    recordedAt: '2026-08-08T06:00:01.000Z',
    workdayDate: '2026-08-08',
    source: TimeEntrySource.EMPLOYEE_DEVICE,
    amended: false,
    voided: false,
    revisions: [
      {
        id: asTimeEntryId('entry-1'),
        action: TimeEntryAction.RECORDED,
        type: TimeEntryType.CLOCK_IN,
        occurredAt: '2026-08-08T06:00:00.000Z',
        recordedAt: '2026-08-08T06:00:01.000Z',
        source: TimeEntrySource.EMPLOYEE_DEVICE,
        actorId: asUserId('user-1'),
        actorName: 'Luis',
        reason: null,
        hash: 'hash-1',
      },
    ],
    ...overrides,
  }) as TimeEntry;

const workday = (entries: TimeEntry[], plannedMinutes: number | null = 480): Workday => ({
  date: '2026-08-08',
  userId: asUserId('user-1'),
  userName: 'Luis',
  state: ClockState.IN,
  workedMinutes: 125,
  breakMinutes: 20,
  plannedMinutes,
  entries,
});

describe('WorkdayCard', () => {
  let fixture: ComponentFixture<WorkdayCard>;

  const render = (value: Workday, canManage = false) => {
    fixture.componentRef.setInput('workday', value);
    fixture.componentRef.setInput('canManage', canManage);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkdayCard],
      providers: [provideZonelessChangeDetection(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkdayCard);
  });

  it('should show worked time against what was planned', () => {
    render(workday([entry()]));

    expect(fixture.nativeElement.textContent).toContain('2h 05m');
    expect(fixture.nativeElement.textContent).toContain('8h 00m');
  });

  it('should drop the planned column when there is no shift for that day', () => {
    render(workday([entry()], null));

    expect(fixture.nativeElement.textContent).not.toContain('roster.time_tracking.planned');
  });

  it('should flag a mark that somebody corrected', () => {
    const amended = entry({
      amended: true,
      revisions: [
        ...entry().revisions,
        {
          id: asTimeEntryId('entry-2'),
          action: TimeEntryAction.AMENDED,
          type: TimeEntryType.CLOCK_IN,
          occurredAt: '2026-08-08T07:00:00.000Z',
          recordedAt: '2026-08-08T18:00:00.000Z',
          source: TimeEntrySource.EMPLOYEE_DEVICE,
          actorId: asUserId('manager-1'),
          actorName: 'Ana',
          reason: 'Olvido fichar',
          hash: 'hash-2',
        },
      ],
    });

    render(workday([amended]));

    expect(fixture.nativeElement.textContent).toContain('roster.time_tracking.badge_amended');
    expect(fixture.nativeElement.querySelector('details')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Olvido fichar');
    expect(fixture.nativeElement.textContent).toContain('Ana');
  });

  it('should keep a voided mark on screen instead of hiding it', () => {
    render(workday([entry({ voided: true, amended: true })]));

    expect(fixture.nativeElement.textContent).toContain('roster.time_tracking.badge_voided');
    expect(fixture.nativeElement.querySelector('.line-through')).toBeTruthy();
  });

  it('should hide the correction buttons from whoever cannot manage the record', () => {
    render(workday([entry()]));

    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
  });

  it('should let a manager correct or void a mark', () => {
    render(workday([entry()]), true);

    let amendEmitted: TimeEntry | undefined;
    let voidEmitted: TimeEntry | undefined;
    fixture.componentInstance.amend.subscribe((value) => (amendEmitted = value));
    fixture.componentInstance.voidEntry.subscribe((value) => (voidEmitted = value));

    const [amendButton, voidButton] = fixture.nativeElement.querySelectorAll('button');
    (amendButton as HTMLButtonElement).click();
    (voidButton as HTMLButtonElement).click();

    expect(amendEmitted?.id).toBe('entry-1');
    expect(voidEmitted?.id).toBe('entry-1');
  });

  it('should let a worker fix a mark of their own without offering to void it', () => {
    fixture.componentRef.setInput('workday', workday([entry()]));
    fixture.componentRef.setInput('canAmend', true);
    fixture.detectChanges();

    let amended: TimeEntry | undefined;
    fixture.componentInstance.amend.subscribe((value) => (amended = value));

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(1);

    (buttons[0] as HTMLButtonElement).click();
    expect(amended?.id).toBe('entry-1');
  });

  it('should not offer to correct a mark that is already void', () => {
    render(workday([entry({ voided: true })]), true);

    expect(fixture.nativeElement.querySelectorAll('button').length).toBe(0);
  });
});
