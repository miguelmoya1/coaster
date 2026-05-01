import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/common';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateShiftForm } from './create-shift-form';

describe('CreateShiftForm', () => {
  let component: CreateShiftForm;
  let fixture: ComponentFixture<CreateShiftForm>;
  let mockSubmitAction: ReturnType<typeof vi.fn>;

  const mockMembers: BarMember[] = [
    {
      userId: asUserId('user-1'),
      userName: 'John Doe',
      role: BarRole.OWNER,
      barId: asBarId('bar-1'),
      active: true,
      id: asBarMemberId('member-1'),
      userEmail: 'john@test.com',
      userImage: '',
    },
  ];

  beforeEach(async () => {
    mockSubmitAction = vi.fn().mockResolvedValue(null);

    await TestBed.configureTestingModule({
      imports: [CreateShiftForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateShiftForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('members', mockMembers);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('submitAction', mockSubmitAction);

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

      expect(mockSubmitAction).toHaveBeenCalledWith({
        userId: 'user-1',
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Lunch break at 12:00',
      });
    });
  });
});
