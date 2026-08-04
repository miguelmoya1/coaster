import type { ConfigService } from '@nestjs/config';

const DEFAULT_FRONTEND_URL = 'http://localhost:4200';

function getFrontendUrl(configService: ConfigService): string {
  return (configService.get<string>('FRONTEND_URL') || DEFAULT_FRONTEND_URL).replace(/\/+$/, '');
}

export function getBillingDashboardUrl(configService: ConfigService, barId: string): string {
  return `${getFrontendUrl(configService)}/bars/${barId}/dashboard`;
}

export function getCheckoutSuccessUrl(configService: ConfigService, barId: string): string {
  return `${getBillingDashboardUrl(configService, barId)}?billing=success&session_id={CHECKOUT_SESSION_ID}`;
}

export function getCheckoutCancelUrl(configService: ConfigService, barId: string): string {
  return `${getBillingDashboardUrl(configService, barId)}?billing=cancelled`;
}
