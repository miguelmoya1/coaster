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

  it('should update value on input event', () => {
    const inputElement = fixture.nativeElement.querySelector('input');
    inputElement.value = 'test value';
    inputElement.dispatchEvent(new Event('input'));
    expect(component.value()).toBe('test value');
  });
});
