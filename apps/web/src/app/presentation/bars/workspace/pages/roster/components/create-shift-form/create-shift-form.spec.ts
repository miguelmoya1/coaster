import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { BarMember } from '@coaster/common';
import { asBarId, asBarMemberId, asUserId, BarRole } from '@coaster/core';
import { ShiftsStore } from '@coaster/shifts';
import { signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateShiftForm } from './create-shift-form';
import { RosterStateService } from '@coaster/roster';
import { DateFormatterService } from '@coaster/core';

describe('CreateShiftForm', () => {
  let component: CreateShiftForm;
  let fixture: ComponentFixture<CreateShiftForm>;
  let mockShiftsStore: { create: ReturnType<typeof vi.fn> };

  const mockMembers: BarMember[] = [
    {
      userId: asUserId('user-1'),
      userName: 'John Doe',
      role: BarRole.OWNER,
      permissions: [],
      barId: asBarId('bar-1'),
      active: true,
      id: asBarMemberId('member-1'),
      userEmail: 'john@test.com',
      userImage: '',
    },
  ];

  beforeEach(async () => {
    mockShiftsStore = {
      create: vi.fn().mockResolvedValue(null),
    };

    const mockRosterState = {
      selectedDate: signal(new Date('2026-05-23T00:00:00.000Z')),
    };

    await TestBed.configureTestingModule({
      imports: [CreateShiftForm, TranslateModule.forRoot()],
      providers: [
        DateFormatterService,
        { provide: ShiftsStore, useValue: mockShiftsStore },
        { provide: RosterStateService, useValue: mockRosterState },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateShiftForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('members', mockMembers);
    fixture.componentRef.setInput('disabled', false);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should disable buttons if disabled input is true', async () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      actionButtons.forEach((button: HTMLButtonElement) => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const spy = vi.spyOn(component.canceled, 'emit');

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const cancelButton = actionButtons[0] as HTMLButtonElement;

      cancelButton.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should call submitAction when form is valid and submitted', async () => {
      const f = component.form;
      f.userId().value.set('user-1');
      f.startTime().value.set('08:00');
      f.endTime().value.set('16:00');
      f.notes().value.set('Lunch break at 12:00');

      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: unknown) => (btn as HTMLButtonElement).getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 0));

      const selectedDate = new Date('2026-05-23T00:00:00.000Z');
      const expectedStart = new Date(selectedDate);
      expectedStart.setHours(8, 0, 0, 0);
      const expectedEnd = new Date(selectedDate);
      expectedEnd.setHours(16, 0, 0, 0);

      expect(mockShiftsStore.create).toHaveBeenCalledWith({
        userId: 'user-1',
        startTime: expectedStart.toISOString(),
        endTime: expectedEnd.toISOString(),
        notes: 'Lunch break at 12:00',
      });
    });
  });
});
