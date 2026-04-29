import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
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
});
