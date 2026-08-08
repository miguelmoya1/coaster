import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import type { TimeEntry } from '@coaster/common';
import { asBarId, asTimeEntryId, asUserId, TimeEntryAction, TimeEntrySource, TimeEntryType } from '@coaster/common';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimeEntryForm } from './time-entry-form';

const entry: TimeEntry = {
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
};

describe('TimeEntryForm', () => {
  let fixture: ComponentFixture<TimeEntryForm>;
  let component: TimeEntryForm;
  let store: { amend: ReturnType<typeof vi.fn>; createEntry: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    store = { amend: vi.fn().mockResolvedValue(undefined), createEntry: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [TimeEntryForm],
      providers: [
        provideZonelessChangeDetection(),
        provideNativeDateAdapter(),
        provideTranslateService(),
        { provide: TimeTrackingStore, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeEntryForm);
    component = fixture.componentInstance;
  });

  const submitForm = async () => {
    fixture.detectChanges();

    const submitButton = Array.from(fixture.nativeElement.querySelectorAll('.justify-end button')).find(
      (button: unknown) => (button as HTMLButtonElement).getAttribute('type') === 'submit',
    ) as HTMLButtonElement;

    submitButton.click();

    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  const renderAmend = () => {
    fixture.componentRef.setInput('entry', entry);
    fixture.componentRef.setInput('workdayDate', '2026-08-08');
    fixture.detectChanges();
  };

  it('should start from the hour the mark already has', () => {
    renderAmend();

    expect(component.form.time().value()).toEqual(new Date(entry.occurredAt));
  });

  it('should refuse to submit without a reason', () => {
    renderAmend();

    expect(component.form().invalid()).toBe(true);
  });

  it('should refuse a reason too short to justify anything', () => {
    renderAmend();
    component.form.reason().value.set('ok');

    expect(component.form().invalid()).toBe(true);
  });

  it('should amend the mark with the new hour and the reason', async () => {
    renderAmend();
    component.form.time().value.set(new Date('2026-08-08T07:30:00'));
    component.form.reason().value.set('El trabajador olvido fichar');

    expect(component.form().invalid()).toBe(false);

    await submitForm();

    expect(store.amend).toHaveBeenCalledWith(
      'entry-1',
      expect.objectContaining({ reason: 'El trabajador olvido fichar' }),
    );
    expect(store.createEntry).not.toHaveBeenCalled();
  });

  it('should place the amended hour on the workday it belongs to', async () => {
    renderAmend();
    component.form.time().value.set(new Date('2026-08-08T07:30:00'));
    component.form.reason().value.set('El trabajador olvido fichar');

    await submitForm();

    const [, dto] = store.amend.mock.calls[0];
    expect(new Date(dto.occurredAt).getHours()).toBe(7);
    expect(dto.occurredAt.slice(0, 4)).toBe('2026');
  });

  it('should create a manual mark when it is not amending anything', async () => {
    fixture.componentRef.setInput('workdayDate', '2026-08-08');
    fixture.componentRef.setInput('members', [{ userId: asUserId('user-2'), userName: 'Ana' }]);
    fixture.detectChanges();

    component.form.userId().value.set('user-2');
    component.form.type().value.set(TimeEntryType.CLOCK_OUT);
    component.form.time().value.set(new Date('2026-08-08T22:00:00'));
    component.form.reason().value.set('El terminal estaba caido');

    await submitForm();

    expect(store.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2', type: TimeEntryType.CLOCK_OUT, reason: 'El terminal estaba caido' }),
    );
  });
});
