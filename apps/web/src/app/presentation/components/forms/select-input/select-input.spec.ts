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
      const label = fixture.nativeElement.querySelector('mat-label');
      expect(label.textContent).toContain('Choice');
    });

    it('should set placeholder', () => {
      fixture.componentRef.setInput('placeholder', 'Pick one');
      fixture.detectChanges();
      expect(component.placeholder()).toBe('Pick one');
    });

    it('should bind value to mat-select', () => {
      fixture.componentRef.setInput('value', '1');
      fixture.detectChanges();
      expect(component.value()).toBe('1');
    });
  });

  describe('actions', () => {
    it('should set touched on blur', () => {
      component.onBlur();
      expect(component.touched()).toBe(true);
    });

    it('should update value on change', () => {
      component.onSelectionChange('2');
      expect(component.value()).toBe('2');
    });
  });

  describe('states', () => {
    it('should accept invalid state', () => {
      fixture.componentRef.setInput('invalid', true);
      fixture.detectChanges();
      expect(component.invalid()).toBe(true);
    });

    it('should disable the component', () => {
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(component.disabled()).toBe(true);
    });
  });
});
