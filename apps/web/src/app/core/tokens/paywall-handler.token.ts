import { InjectionToken } from '@angular/core';
import type { EstablishmentId } from '../models/establishment-id';

export interface PaywallHandler {
  open(establishmentId: EstablishmentId): void;
}

export const PAYWALL_HANDLER = new InjectionToken<PaywallHandler>('PAYWALL_HANDLER');
