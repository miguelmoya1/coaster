import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NumberInput } from './number-input';

describe('NumberInput', () => {
  let component: NumberInput;
  let fixture: ComponentFixture<NumberInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberInput],
    }).compileComponents();

    fixture = TestBed.createComponent(NumberInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update value on input event', () => {
    const inputElement = fixture.nativeElement.querySelector('input');
    inputElement.value = '42';
    inputElement.dispatchEvent(new Event('input'));
    expect(component.value()).toBe(42);
  });

  it('should not update value on invalid input', () => {
    const inputElement = fixture.nativeElement.querySelector('input');
    inputElement.value = 'abc';
    inputElement.dispatchEvent(new Event('input'));
    expect(component.value()).toBe(0); // remains default
  });

  it('should increment value', () => {
    component.value.set(0);
    component.increment();
    expect(component.value()).toBe(1);
    expect(component.touched()).toBe(true);
  });

  it('should not increment above max', () => {
    fixture.componentRef.setInput('max', 5);
    component.value.set(5);
    component.increment();
    expect(component.value()).toBe(5);
  });

  it('should decrement value', () => {
    component.value.set(5);
    component.decrement();
    expect(component.value()).toBe(4);
    expect(component.touched()).toBe(true);
  });

  it('should not decrement below min', () => {
    fixture.componentRef.setInput('min', 0);
    component.value.set(0);
    component.decrement();
    expect(component.value()).toBe(0);
  });

  it('should not increment or decrement when disabled or readonly', () => {
    fixture.componentRef.setInput('disabled', true);
    component.value.set(5);
    component.increment();
    expect(component.value()).toBe(5);
    component.decrement();
    expect(component.value()).toBe(5);

    fixture.componentRef.setInput('disabled', false);
    fixture.componentRef.setInput('readonly', true);
    component.increment();
    expect(component.value()).toBe(5);
  });

  it('should stop event propagation on click', () => {
    const event = new Event('click');
    const stopSpy = vi.spyOn(event, 'stopPropagation');
    component.onHostClick(event);
    expect(stopSpy).toHaveBeenCalled();
  });
});
