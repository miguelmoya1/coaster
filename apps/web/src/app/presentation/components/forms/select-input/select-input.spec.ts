import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SelectInput, SelectOption } from './select-input';

describe('SelectInput', () => {
  let component: SelectInput;
  let fixture: ComponentFixture<SelectInput>;

  const mockOptions: SelectOption[] = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectInput],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectInput);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('rendering', () => {
    it('should show label if provided', () => {
      fixture.componentRef.setInput('label', 'Choice');
      fixture.detectChanges();
      const label = fixture.nativeElement.querySelector('label');
      expect(label.textContent).toContain('Choice');
    });

    it('should show placeholder when no value is selected', () => {
      fixture.componentRef.setInput('placeholder', 'Pick one');
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('select');
      const placeholderOption = select.querySelector('option[disabled]');
      expect(placeholderOption.textContent).toContain('Pick one');
    });

    it('should set select value when an option is selected', () => {
      fixture.componentRef.setInput('value', '1');
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('select');
      expect(select.value).toBe('1');
    });
  });

  describe('actions', () => {
    it('should set touched on blur', () => {
      const select = fixture.nativeElement.querySelector('select');
      select.dispatchEvent(new Event('blur'));
      expect(component.touched()).toBe(true);
    });

    it('should update value on change', () => {
      const select = fixture.nativeElement.querySelector('select');
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      expect(component.value()).toBe('2');
    });
  });

  describe('states', () => {
    it('should apply border-error when invalid', () => {
      fixture.componentRef.setInput('invalid', true);
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('select');
      expect(select.classList.contains('border-error')).toBe(true);
    });

    it('should disable the select element', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      const select = fixture.nativeElement.querySelector('select');
      expect(select.disabled).toBe(true);
      expect(select.classList.contains('opacity-50')).toBe(true);
    });
  });
});
