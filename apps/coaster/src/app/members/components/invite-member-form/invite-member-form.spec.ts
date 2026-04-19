import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { InviteMemberForm } from './invite-member-form';

describe('InviteMemberForm', () => {
  let component: InviteMemberForm;
  let fixture: ComponentFixture<InviteMemberForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteMemberForm, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(InviteMemberForm);
    component = fixture.componentInstance;
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

    it('should disable buttons if disabled input is true', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button.disabled).toBe(true);
      });
    });
  });

  describe('actions', () => {
    it('should emit canceled when cancel button is clicked', () => {
      const spy = vi.spyOn(component.canceled, 'emit');
      const cancelButton = fixture.nativeElement.querySelectorAll('button')[0];

      cancelButton.click();

      expect(spy).toHaveBeenCalled();
    });

    it('should emit inviteMember when form is valid and submitted', async () => {
      const spy = vi.spyOn(component.inviteMember, 'emit');

      // Set value via DOM to ensure typical interaction flow
      const input = fixture.nativeElement.querySelector('input');
      input.value = 'test@test.com';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelectorAll('button')[1];
      submitButton.click();

      // Wait for async form submission
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(spy).toHaveBeenCalledWith({ email: 'test@test.com' });
    });
  });
});
