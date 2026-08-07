import { inject, inputBinding, outputBinding, Service } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from './confirm-dialog.component';

export interface ConfirmationDialogOptions {
  title: string;
  text: string;
  destructive?: boolean;
  confirmLabel?: string;
}

@Service()
export class ConfirmationDialog {
  readonly #dialog = inject(MatDialog);

  async confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    const dialogRef: MatDialogRef<ConfirmDialogComponent, boolean> = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => options.destructive ?? false),
        inputBinding('title', () => options.title),
        inputBinding('text', () => options.text),
        ...(options.confirmLabel ? [inputBinding('confirmLabel', () => options.confirmLabel!)] : []),
        outputBinding('canceled', () => dialogRef.close(false)),
        outputBinding('deleted', () => dialogRef.close(true)),
      ],
    });

    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }
}
