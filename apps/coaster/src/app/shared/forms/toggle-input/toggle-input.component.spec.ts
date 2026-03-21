import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ToggleInputComponent } from './toggle-input.component';

describe('ToggleInputComponent', () => {
  let component: ToggleInputComponent;
  let fixture: ComponentFixture<ToggleInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleInputComponent);
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
