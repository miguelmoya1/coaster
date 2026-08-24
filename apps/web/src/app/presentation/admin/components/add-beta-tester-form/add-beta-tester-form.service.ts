import { inject, outputBinding, Service } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { AddBetaTesterForm } from './add-beta-tester-form';

@Service()
export class AddBetaTesterFormService {
  readonly #dialog = inject(MatDialog);

  async open(): Promise<boolean> {
    const dialogRef: MatDialogRef<AddBetaTesterForm, boolean> = this.#dialog.open(AddBetaTesterForm, {
      bindings: [
        outputBinding('added', () => dialogRef.close(true)),
        outputBinding('canceled', () => dialogRef.close(false)),
      ],
    });

    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }
}
