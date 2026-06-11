import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { provideTranslateService } from '@ngx-translate/core';

import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [provideNoopAnimations(), provideTranslateService()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;

    // Set required inputs using ComponentRef.setInput()
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('text', 'Test Text');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and text', () => {
    const titleEl = fixture.nativeElement.querySelector('h2');
    const textEls = fixture.nativeElement.querySelectorAll('p');
    // By default subtitle is not set, so the first paragraph is the text
    expect(titleEl.textContent.trim()).toBe('Test Title');
    expect(textEls[0].textContent.trim()).toBe('Test Text');
  });



  it('should not show warning icon when destructive is false', () => {
    const iconEl = fixture.nativeElement.querySelector('mat-icon');
    expect(iconEl).toBeNull();
  });

  it('should show warning icon and red button when destructive is true', () => {
    fixture.componentRef.setInput('destructive', true);
    fixture.detectChanges();

    const iconEl = fixture.nativeElement.querySelector('mat-icon');
    expect(iconEl).toBeTruthy();

    const confirmButton = fixture.nativeElement.querySelector('button.warn');
    expect(confirmButton).toBeTruthy();
  });

  it('should emit canceled when cancel button is clicked', () => {
    let emitted = false;
    component.canceled.subscribe(() => (emitted = true));
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[0].click();
    expect(emitted).toBe(true);
  });

  it('should emit deleted when confirm button is clicked', () => {
    let emitted = false;
    component.deleted.subscribe(() => (emitted = true));
    const buttons = fixture.nativeElement.querySelectorAll('button');
    buttons[1].click();
    expect(emitted).toBe(true);
  });
});
