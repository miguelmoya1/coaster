import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChipSelect } from './chip-select';

describe('ChipSelect', () => {
  let component: ChipSelect;
  let fixture: ComponentFixture<ChipSelect>;

  const options = [
    { value: 'GLUTEN', label: 'gluten' },
    { value: 'MILK', label: 'lácteos' },
    { value: 'FISH', label: 'pescado' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChipSelect] }).compileComponents();

    fixture = TestBed.createComponent(ChipSelect);
    fixture.componentRef.setInput('options', options);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render one chip per option', () => {
    expect(fixture.nativeElement.querySelectorAll('mat-chip-option').length).toBe(3);
  });

  it('should keep the value as an array even when a single option comes back', () => {
    component['onChange']('MILK');

    expect(component.value()).toEqual(['MILK']);
  });

  it('should take the whole selection when several come back', () => {
    component['onChange'](['MILK', 'FISH']);

    expect(component.value()).toEqual(['MILK', 'FISH']);
  });

  it('should read an empty selection as nothing chosen, not as null', () => {
    component['onChange'](null);

    expect(component.value()).toEqual([]);
  });

  it('should mark itself touched once somebody chooses', () => {
    expect(component.touched()).toBe(false);

    component['onChange'](['MILK']);

    expect(component.touched()).toBe(true);
  });

  it('should ignore changes while disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    component['onChange'](['MILK']);

    expect(component.value()).toEqual([]);
  });

  it('should show the label and the hint it is given', () => {
    fixture.componentRef.setInput('label', 'Alérgenos');
    fixture.componentRef.setInput('hint', 'Se ven en la carta');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Alérgenos');
    expect(text).toContain('Se ven en la carta');
  });

  it('should render nothing at all when hidden', () => {
    fixture.componentRef.setInput('hidden', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('fieldset')).toBeNull();
  });
});
