import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TimeEntry } from '@coaster/common';
import { asBarId, asTimeEntryId, asUserId, TimeEntrySource, TimeEntryType } from '@coaster/common';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoidEntryForm } from './void-entry-form';

const entry = {
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
  revisions: [],
} as unknown as TimeEntry;

describe('VoidEntryForm', () => {
  let fixture: ComponentFixture<VoidEntryForm>;
  let component: VoidEntryForm;
  let store: { voidEntry: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    store = { voidEntry: vi.fn().mockResolvedValue(undefined) };

    await TestBed.configureTestingModule({
      imports: [VoidEntryForm],
      providers: [
        provideZonelessChangeDetection(),
        provideTranslateService(),
        { provide: TimeTrackingStore, useValue: store },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VoidEntryForm);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('entry', entry);
    fixture.detectChanges();
  });

  it('should not let anyone void a mark without saying why', () => {
    expect(component.form().invalid()).toBe(true);
  });

  it('should void the mark with the reason given', async () => {
    component.form.reason().value.set('Marca duplicada del terminal');
    fixture.detectChanges();

    const submitButton = Array.from(fixture.nativeElement.querySelectorAll('.justify-end button')).find(
      (button: unknown) => (button as HTMLButtonElement).getAttribute('type') === 'submit',
    ) as HTMLButtonElement;

    submitButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(store.voidEntry).toHaveBeenCalledWith('entry-1', { reason: 'Marca duplicada del terminal' });
  });
});
