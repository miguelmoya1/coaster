import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { MultiSelectInput } from './multi-select-input';

describe('MultiSelectInput', () => {
  let component: MultiSelectInput;
  let fixture: ComponentFixture<MultiSelectInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiSelectInput],
    }).compileComponents();

    fixture = TestBed.createComponent(MultiSelectInput);
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
