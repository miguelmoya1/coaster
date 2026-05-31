import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToggleInput } from './toggle-input';

describe('ToggleInput', () => {
  let component: ToggleInput;
  let fixture: ComponentFixture<ToggleInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleInput],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle state on click', () => {
    const buttonElement = fixture.nativeElement.querySelector('button');
    expect(component.checked()).toBe(false);
    buttonElement.click();
    expect(component.checked()).toBe(true);
  });
});
