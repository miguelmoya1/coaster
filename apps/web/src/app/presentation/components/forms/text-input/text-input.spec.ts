import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TextInput } from './text-input';

describe('TextInput', () => {
  let component: TextInput;
  let fixture: ComponentFixture<TextInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextInput],
    }).compileComponents();

    fixture = TestBed.createComponent(TextInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show label if provided', () => {
      fixture.componentRef.setInput('label', 'User Name');
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).toContain('User Name');
    });

    it('should show asterisk if required', () => {
      fixture.componentRef.setInput('label', 'User Name');
      fixture.componentRef.setInput('required', true);
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).toContain('*');
    });

    it('should show placeholder', () => {
      fixture.componentRef.setInput('placeholder', 'Enter name');
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      expect(input.placeholder).toBe('Enter name');
    });

    it('should show icon if provided', () => {
      fixture.componentRef.setInput('icon', 'lucideUser');
      fixture.detectChanges();
      const icon = fixture.nativeElement.querySelector('ng-icon');
      expect(icon).toBeTruthy();
    });
  });

  describe('actions', () => {
    it('should update value on input event', () => {
      const input = fixture.nativeElement.querySelector('input');
      input.value = 'New Value';
      input.dispatchEvent(new Event('input'));
      expect(component.value()).toBe('New Value');
    });

    it('should set touched to true on blur', () => {
      const input = fixture.nativeElement.querySelector('input');
      input.dispatchEvent(new Event('blur'));
      expect(component.touched()).toBe(true);
    });
  });

  describe('states', () => {
    it('should apply border-error class when invalid', () => {
      fixture.componentRef.setInput('invalid', true);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      expect(input.classList.contains('border-error')).toBe(true);
    });

    it('should disable the input element', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      const input = fixture.nativeElement.querySelector('input');
      expect(input.disabled).toBe(true);
    });

    it('should show alert icon when invalid, touched and not disabled', () => {
      fixture.componentRef.setInput('invalid', true);
      fixture.componentRef.setInput('touched', true);
      fixture.componentRef.setInput('disabled', false);
      fixture.detectChanges();

      const alertIcon = fixture.nativeElement.querySelector('ng-icon[name="lucideAlertCircle"]');
      expect(alertIcon).toBeTruthy();
    });
  });
});
