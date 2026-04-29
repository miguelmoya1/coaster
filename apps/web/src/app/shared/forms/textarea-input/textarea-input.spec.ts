import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TextareaInput } from './textarea-input';

describe('TextareaInput', () => {
  let component: TextareaInput;
  let fixture: ComponentFixture<TextareaInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaInput],
    }).compileComponents();

    fixture = TestBed.createComponent(TextareaInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update value on input event', () => {
    const textareaElement = fixture.nativeElement.querySelector('textarea');
    textareaElement.value = 'multi line text';
    textareaElement.dispatchEvent(new Event('input'));
    expect(component.value()).toBe('multi line text');
  });
});
