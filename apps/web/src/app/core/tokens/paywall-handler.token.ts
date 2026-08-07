import { InjectionToken } from '@angular/core';
import type { BarId } from '@coaster/common';

export interface PaywallHandler {
  open(barId: BarId): void;
}

export const PAYWALL_HANDLER = new InjectionToken<PaywallHandler>('PAYWALL_HANDLER');
