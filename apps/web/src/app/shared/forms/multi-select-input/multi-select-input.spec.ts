import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiSelectInput, MultiSelectOption } from './multi-select-input';

describe('MultiSelectInput', () => {
  let component: MultiSelectInput;
  let fixture: ComponentFixture<MultiSelectInput>;

  const mockOptions: MultiSelectOption[] = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSelectInput],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiSelectInput);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('options', mockOptions);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply border-error when invalid', () => {
    fixture.componentRef.setInput('invalid', true);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select');
    expect(select.classList.contains('border-error')).toBe(true);
  });

  it('should update value on change', () => {
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    Array.from(select.options).forEach((opt) => {
      if (opt.value === '1' || opt.value === '2') {
        opt.selected = true;
      }
    });

    select.dispatchEvent(new Event('change'));
    expect(component.value()).toEqual(['1', '2']);
  });
});
