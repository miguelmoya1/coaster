import { inject, inputBinding, outputBinding, Service, signal } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EstablishmentId, ErrorCodes, EstablishmentPermission, SubscriptionPlan } from '@coaster/common';
import { ApiError, Toast } from '@coaster/core';
import { MyMemberStore } from '@coaster/establishment-members';
import { SelectPlanDialog } from '../dialogs/select-plan-dialog/select-plan-dialog';
import { BillingAction, EstablishmentSubscriptionStore } from '../store/establishment-subscription.store';

// La única puerta a facturación. La directiva de bloqueo, el interceptor del 402, el banner,
// el panel y el menú entran todos por aquí, así que la decisión de a dónde llevar vive aquí y
// solo aquí: mientras exista una suscripción en Stripe, checkout la rechaza y el sitio es el portal.
@Service()
export class BillingEntryPoint {
  readonly #dialog = inject(MatDialog);
  readonly #establishmentSubscriptionStore = inject(EstablishmentSubscriptionStore);
  readonly #toast = inject(Toast);
  readonly #myMemberStore = inject(MyMemberStore);
  #openDialogRef: MatDialogRef<SelectPlanDialog> | null = null;

  public open(establishmentId: EstablishmentId): void {
    // Solo el propietario puede pagar: la API exige establishment:manage-billing en checkout y
    // en el portal. A quien no lo tiene se le cuenta qué pasa, no se le enseña una puerta que
    // termina en un 403.
    if (!this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING)) {
      this.#toast.show('billing.locked_ask_owner', 'info', 5000);
      return;
    }

    if (this.#establishmentSubscriptionStore.billingAction() === BillingAction.MANAGE) {
      void this.#openBillingPortal();
      return;
    }

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
            const checkoutUrl = await this.#establishmentSubscriptionStore.createCheckoutSession(establishmentId, plan);
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

  async #openBillingPortal(): Promise<void> {
    try {
      const portalUrl = await this.#establishmentSubscriptionStore.createCustomerPortalSession();

      if (portalUrl) {
        window.location.assign(portalUrl);
        return;
      }

      this.#toast.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
    } catch (error) {
      if (!(error instanceof ApiError)) {
        this.#toast.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    }
  }
}
