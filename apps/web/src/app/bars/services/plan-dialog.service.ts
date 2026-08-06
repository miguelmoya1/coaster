import { inject, Injectable, inputBinding, outputBinding, signal } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { BarId, ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { ApiError, Toast } from '@coaster/core';
import { SelectPlanDialog } from '../dialogs/select-plan-dialog/select-plan-dialog';
import { BarSubscriptionStore } from '../store/bar-subscription.store';

@Injectable({ providedIn: 'root' })
export class PlanDialogService {
  readonly #dialog = inject(MatDialog);
  readonly #barSubscriptionStore = inject(BarSubscriptionStore);
  readonly #toast = inject(Toast);
  #openDialogRef: MatDialogRef<SelectPlanDialog> | null = null;

  public open(barId: BarId): void {
    if (this.#openDialogRef) {
      return;
    }

    const loading = signal(false);
    const dialogRef = this.#dialog.open(SelectPlanDialog, {
      width: '520px',
      maxWidth: '90vw',
      bindings: [
        inputBinding('loading', loading),
        outputBinding('selected', async (plan: Exclude<SubscriptionPlan, 'FREE'>) => {
          if (loading()) return;
          loading.set(true);
          try {
            const checkoutUrl = await this.#barSubscriptionStore.createCheckoutSession(barId, plan);
            if (checkoutUrl) {
              dialogRef.close();
              window.location.assign(checkoutUrl);
              return;
            }
            this.#toast.error(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
          } catch (error) {
            if (!(error instanceof ApiError)) {
              this.#toast.error(ErrorCodes.STRIPE_CHECKOUT_SESSION_FAILED);
            }
          } finally {
            loading.set(false);
          }
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });

    this.#openDialogRef = dialogRef;
    dialogRef.afterClosed().subscribe(() => {
      this.#openDialogRef = null;
    });
  }
}
