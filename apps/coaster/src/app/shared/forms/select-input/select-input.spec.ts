import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { SelectInput } from './select-input';

describe('SelectInput', () => {
  let component: SelectInput;
  let fixture: ComponentFixture<SelectInput>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectInput],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectInput);
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
