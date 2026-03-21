import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiSelectInputComponent } from './multi-select-input.component';

describe('MultiSelectInputComponent', () => {
  let component: MultiSelectInputComponent;
  let fixture: ComponentFixture<MultiSelectInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSelectInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiSelectInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should open overlay on trigger click', () => {
    const trigger = fixture.nativeElement.querySelector('button');
    expect(component.isOpen()).toBe(false);
    trigger.click();
    expect(component.isOpen()).toBe(true);
  });
});
