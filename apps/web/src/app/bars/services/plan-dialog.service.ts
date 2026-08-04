import { inject, Injectable, inputBinding, outputBinding, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BarId, ErrorCodes, SubscriptionPlan } from '@coaster/common';
import { ApiError } from '../../core/errors/api-error';
import { Toast } from '../../core/services/toast';
import { SelectPlanDialog } from '../../presentation/bars/workspace/components/select-plan-dialog/select-plan-dialog';
import { BarSubscriptionStore } from '../store/bar-subscription.store';

@Injectable({ providedIn: 'root' })
export class PlanDialogService {
  readonly #dialog = inject(MatDialog);
  readonly #barSubscriptionStore = inject(BarSubscriptionStore);
  readonly #toast = inject(Toast);

  public open(barId: BarId): void {
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
  }
}
