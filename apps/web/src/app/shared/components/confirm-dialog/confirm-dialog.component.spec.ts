import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('isOpen', true);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and message from inputs', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h2');
    const message = compiled.querySelector('p');

    expect(title?.textContent).toContain('Test Title');
    expect(message?.textContent).toContain('Test Message');
  });

  it('should emit cancelled event when cancel button is clicked', () => {
    const cancelledSpy = vi.spyOn(component.cancelled, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const cancelButton = buttons[0];

    cancelButton.click();

    expect(cancelledSpy).toHaveBeenCalled();
  });

  it('should emit confirmed event when confirm button is clicked', () => {
    const confirmedSpy = vi.spyOn(component.confirmed, 'emit');
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const confirmButton = buttons[1];

    confirmButton.click();

    expect(confirmedSpy).toHaveBeenCalled();
  });
});
