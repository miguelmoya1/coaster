import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeClient {
  private _stripe?: Stripe;

  constructor(private readonly _configService: ConfigService) {}

  public get client(): Stripe {
    if (this._stripe) {
      return this._stripe;
    }

    const apiKey = this._configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not configured');
    }

    this._stripe = new Stripe(apiKey);

    return this._stripe;
  }
}
