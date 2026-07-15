import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationDialog } from './confirmation-dialog.service';

describe('ConfirmationDialog', () => {
  let service: ConfirmationDialog;

  const dialogRef = {
    afterClosed: vi.fn(),
    close: vi.fn(),
  };
  const dialogMock = {
    open: vi.fn(),
  };

  beforeEach(() => {
    dialogRef.afterClosed.mockReturnValue(of(false));
    dialogRef.close.mockReset();
    dialogMock.open.mockReturnValue(dialogRef);
    dialogMock.open.mockClear();

    TestBed.configureTestingModule({
      providers: [ConfirmationDialog, { provide: MatDialog, useValue: dialogMock }],
    });

    service = TestBed.inject(ConfirmationDialog);
  });

  it('should resolve true when the dialog confirms', async () => {
    dialogRef.afterClosed.mockReturnValue(of(true));

    await expect(service.confirm({ title: 'Delete', text: 'Continue?', destructive: true })).resolves.toBe(true);
  });

  it('should resolve false when the dialog is dismissed', async () => {
    await expect(service.confirm({ title: 'Delete', text: 'Continue?' })).resolves.toBe(false);
  });
});
