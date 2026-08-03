import { inject, Injectable, outputBinding } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SubscriptionPlan } from '@coaster/common';
import { Toast } from '../../core/services/toast';
import { SelectPlanDialog } from '../../presentation/bars/workspace/components/select-plan-dialog/select-plan-dialog';
import { BarSubscriptionStore } from '../store/bar-subscription.store';
import { CurrentBarStore } from '../store/current-bar.store';

@Injectable({ providedIn: 'root' })
export class PlanDialogService {
  readonly #dialog = inject(MatDialog);
  readonly #barSubscriptionStore = inject(BarSubscriptionStore);
  readonly #currentBarStore = inject(CurrentBarStore);
  readonly #toast = inject(Toast);

  public open(): void {
    const dialogRef = this.#dialog.open(SelectPlanDialog, {
      width: '520px',
      maxWidth: '90vw',
      bindings: [
        outputBinding('selected', async (plan: Exclude<SubscriptionPlan, 'FREE'>) => {
          dialogRef.close();
          const barId = this.#currentBarStore.currentId();
          const returnUrl = barId
            ? `${window.location.origin}/bars/${barId}/dashboard`
            : `${window.location.origin}/bars/select`;
          const checkoutUrl = await this.#barSubscriptionStore.createCheckoutSession(returnUrl, plan);

          if (checkoutUrl) {
            window.location.assign(checkoutUrl);
          } else {
            this.#toast.error('errors.stripe_connection');
          }
        }),
        outputBinding('canceled', () => {
          dialogRef.close();
        }),
      ],
    });
  }
}
