import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import { CoasterQtyAdjuster } from './qty-adjuster';

@Component({
  imports: [CoasterQtyAdjuster],
  template: `
    <div
      (click)="onParentClick()"
      (keydown.enter)="onParentClick()"
      (keydown.space)="onParentClick(); $event.preventDefault()"
      tabindex="0"
      role="button"
    >
      <coaster-qty-adjuster [value]="value()" (valueChange)="value.set($event)" [min]="1" [max]="5" />
    </div>
  `,
})
class TestWrapperComponent {
  readonly value = signal(3);
  parentClicked = false;

  onParentClick() {
    this.parentClicked = true;
  }
}

describe('CoasterQtyAdjuster', () => {
  let wrapperComponent: TestWrapperComponent;
  let fixture: ComponentFixture<TestWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestWrapperComponent, CoasterQtyAdjuster],
    }).compileComponents();

    fixture = TestBed.createComponent(TestWrapperComponent);
    wrapperComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should stop click propagation to parent when clicking the host element', () => {
    const hostEl = fixture.debugElement.query(By.directive(CoasterQtyAdjuster)).nativeElement;
    hostEl.click();
    fixture.detectChanges();
    expect(wrapperComponent.parentClicked).toBe(false);
  });

  it('should stop click propagation when clicking active decrement/increment buttons', () => {
    const buttons = fixture.debugElement.queryAll(By.css('button'));
    expect(buttons.length).toBe(2);

    // Click decrement
    buttons[0].nativeElement.click();
    fixture.detectChanges();
    expect(wrapperComponent.parentClicked).toBe(false);
    expect(wrapperComponent.value()).toBe(2);

    // Click increment
    buttons[1].nativeElement.click();
    fixture.detectChanges();
    expect(wrapperComponent.parentClicked).toBe(false);
    expect(wrapperComponent.value()).toBe(3);
  });

  it('should stop click propagation and not modify value when clicking a disabled-state button', () => {
    // Set value to min so decrement button is in disabled state
    wrapperComponent.value.set(1);
    fixture.detectChanges();

    const buttons = fixture.debugElement.queryAll(By.css('button'));
    const decButton = buttons[0].nativeElement as HTMLButtonElement;

    // It should have disabled visual classes
    expect(decButton.classList.contains('opacity-30')).toBe(true);
    expect(decButton.classList.contains('cursor-not-allowed')).toBe(true);
    expect(decButton.classList.contains('cursor-pointer')).toBe(false);
    expect(decButton.classList.contains('active:scale-90')).toBe(false);

    // Trigger click on the disabled-state button
    decButton.click();
    fixture.detectChanges();

    // Value should not be changed (still 1) and click should not bubble to parent wrapper
    expect(wrapperComponent.value()).toBe(1);
    expect(wrapperComponent.parentClicked).toBe(false);
  });
});
