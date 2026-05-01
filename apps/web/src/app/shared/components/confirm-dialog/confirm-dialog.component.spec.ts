import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let dialogRefMock: Record<string, Mock>;

  const mockData: ConfirmDialogData = {
    title: 'Test Title',
    message: 'Test Message',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDestructive: true,
  };

  beforeEach(async () => {
    dialogRefMock = {
      close: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DialogRef, useValue: dialogRefMock },
        { provide: DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and message from data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('h2');
    const message = compiled.querySelector('p');

    expect(title?.textContent).toContain('Test Title');
    expect(message?.textContent).toContain('Test Message');
  });

  it('should call dialogRef.close(false) when cancel button is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const cancelButton = buttons[0]; // First button is cancel

    cancelButton.click();

    expect(dialogRefMock['close']).toHaveBeenCalledWith(false);
  });

  it('should call dialogRef.close(true) when confirm button is clicked', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = compiled.querySelectorAll('button');
    const confirmButton = buttons[1]; // Second button is confirm

    confirmButton.click();

    expect(dialogRefMock['close']).toHaveBeenCalledWith(true);
  });
});
