import { ErrorCodes } from '@coaster/common';
import { HttpException, HttpStatus } from '@nestjs/common';

const STRIPE_CONFIGURATION_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_PRO'] as const;

export function validateStripeConfiguration(config: Record<string, unknown>): Record<string, unknown> {
  const configuredKeys = STRIPE_CONFIGURATION_KEYS.filter((key) => Boolean(config[key]));
  const isProduction = config['NODE_ENV'] === 'production';
  const requiredKeys = isProduction ? [...STRIPE_CONFIGURATION_KEYS, 'FRONTEND_URL'] : STRIPE_CONFIGURATION_KEYS;

  if (isProduction || configuredKeys.length > 0) {
    const missingKeys = requiredKeys.filter((key) => !config[key]);
    if (missingKeys.length > 0) {
      throw new HttpException(ErrorCodes.STRIPE_CONFIGURATION_INVALID, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  if (config['FRONTEND_URL']) {
    try {
      const frontendUrl = new URL(String(config['FRONTEND_URL']));
      if (!['http:', 'https:'].includes(frontendUrl.protocol))
        throw new HttpException(ErrorCodes.STRIPE_CONFIGURATION_INVALID, HttpStatus.INTERNAL_SERVER_ERROR);
    } catch {
      throw new HttpException(ErrorCodes.STRIPE_CONFIGURATION_INVALID, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  return config;
}
