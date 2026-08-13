import { InjectionToken } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';

export interface PaywallHandler {
  open(establishmentId: EstablishmentId): void;
}

export const PAYWALL_HANDLER = new InjectionToken<PaywallHandler>('PAYWALL_HANDLER');
