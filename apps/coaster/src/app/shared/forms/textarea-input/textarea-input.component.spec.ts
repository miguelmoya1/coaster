import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { TextareaInputComponent } from './textarea-input.component';

describe('TextareaInputComponent', () => {
  let component: TextareaInputComponent;
  let fixture: ComponentFixture<TextareaInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextareaInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TextareaInputComponent);
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
