import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { asUserId, BarMember } from '@coaster/interfaces';
import { CreateShiftForm } from './create-shift-form';

describe('CreateShiftForm', () => {
  let component: CreateShiftForm;
  let fixture: ComponentFixture<CreateShiftForm>;

  const mockMembers: BarMember[] = [
    {
      userId: asUserId('user-1'),
      userName: 'John Doe',
      email: 'john@test.com',
      role: 'OWNER',
      barId: 'bar-1' as any,
      image: '',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateShiftForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateShiftForm);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('members', mockMembers);
    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('error', undefined);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show error message if error input is set', () => {
      fixture.componentRef.setInput('error', 'test error');
      fixture.detectChanges();

      const element: HTMLElement = fixture.nativeElement;
      expect(element.textContent).toContain('test error');
    });

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

    it('should emit createShift when form is valid and submitted', async () => {
      const spy = vi.spyOn(component.createShift, 'emit');

      // Accessing form via FieldTree pattern
      const f = (component as any).form;
      f.userId().value.set('user-1');
      f.startTime().value.set('08:00');
      f.endTime().value.set('16:00');
      f.notes().value.set('Lunch break at 12:00');

      fixture.detectChanges();

      const actionButtons = fixture.nativeElement.querySelectorAll('.justify-end button');
      const submitButton = Array.from(actionButtons).find(
        (btn: any) => btn.getAttribute('type') === 'submit',
      ) as HTMLButtonElement;

      submitButton.click();

      // Wait for async form submission
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({
        userId: 'user-1',
        startTime: '08:00',
        endTime: '16:00',
        notes: 'Lunch break at 12:00',
      });
    });
  });
});
