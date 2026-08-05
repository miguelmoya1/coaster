import { ErrorCodes } from '@coaster/common';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClient {
  readonly #logger = new Logger(StripeClient.name);
  #stripe?: Stripe;

  constructor(private readonly _configService: ConfigService) {}

  public get client(): Stripe {
    if (this.#stripe) {
      return this.#stripe;
    }

    this.#logger.debug('Initializing Stripe SDK client...');
    const apiKey = this._configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      this.#logger.error('STRIPE_SECRET_KEY is not configured in environment variables');
      throw new InternalServerErrorException(ErrorCodes.STRIPE_SECRET_KEY_NOT_CONFIGURED);
    }

    this.#stripe = new Stripe(apiKey, {
      apiVersion: '2026-06-24.dahlia',
    });
    this.#logger.debug('Stripe SDK client initialized successfully');

    return this.#stripe;
  }
}
