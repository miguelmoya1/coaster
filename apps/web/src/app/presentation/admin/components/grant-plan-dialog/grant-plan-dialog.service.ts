import { inject, inputBinding, outputBinding, Service } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { GrantPlanDialog, type GrantPlanResult } from './grant-plan-dialog';

@Service()
export class GrantPlanDialogService {
  readonly #dialog = inject(MatDialog);

  async open(barName: string): Promise<GrantPlanResult | null> {
    const dialogRef: MatDialogRef<GrantPlanDialog, GrantPlanResult> = this.#dialog.open(GrantPlanDialog, {
      bindings: [
        inputBinding('barName', () => barName),
        outputBinding<GrantPlanResult>('confirmed', (result) => dialogRef.close(result)),
        outputBinding('canceled', () => dialogRef.close(undefined)),
      ],
    });

    return (await firstValueFrom(dialogRef.afterClosed())) ?? null;
  }
}
