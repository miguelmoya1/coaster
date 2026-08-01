import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClient {
  private readonly _logger = new Logger(StripeClient.name);
  private _stripe?: Stripe;

  constructor(private readonly _configService: ConfigService) {}

  public get client(): Stripe {
    if (this._stripe) {
      return this._stripe;
    }

    this._logger.debug('Initializing Stripe SDK client...');
    const apiKey = this._configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      this._logger.error('STRIPE_SECRET_KEY is not configured in environment variables');
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not configured');
    }

    this._stripe = new Stripe(apiKey);
    this._logger.debug('Stripe SDK client initialized successfully');

    return this._stripe;
  }
}
