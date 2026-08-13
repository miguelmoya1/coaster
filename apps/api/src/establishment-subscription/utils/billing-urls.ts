import type { ConfigService } from '@nestjs/config';

const DEFAULT_FRONTEND_URL = 'http://localhost:4200';

function getFrontendUrl(configService: ConfigService): string {
  return (configService.get<string>('FRONTEND_URL') || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
}

export function getBillingDashboardUrl(configService: ConfigService, establishmentId: string): string {
  return `${getFrontendUrl(configService)}/establishments/${establishmentId}/dashboard`;
}

export function getCheckoutSuccessUrl(configService: ConfigService, establishmentId: string): string {
  return `${getBillingDashboardUrl(configService, establishmentId)}?billing=success&session_id={CHECKOUT_SESSION_ID}`;
}

export function getCheckoutCancelUrl(configService: ConfigService, establishmentId: string): string {
  return `${getBillingDashboardUrl(configService, establishmentId)}?billing=cancelled`;
}
