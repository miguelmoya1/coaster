import { ErrorCodes } from '@coaster/common';
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyRequest } from 'fastify';
import Stripe from 'stripe';
import { StripeClient } from '../utils/stripe-client.provider';

export type FastifyStripeRequest = FastifyRequest & {
  rawBody?: string;
  stripeEvent?: Stripe.Event;
};

@Injectable()
export class StripeWebhookGuard implements CanActivate {
  private readonly _logger = new Logger(StripeWebhookGuard.name);

  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this._logger.debug('Validating incoming Stripe webhook request...');
    const request = context.switchToHttp().getRequest<FastifyStripeRequest>();
    const signature = request.headers['stripe-signature'] as string | undefined;
    const rawBody = request.rawBody ?? '';

    const webhookSecret = this._configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this._logger.error('STRIPE_WEBHOOK_SECRET is not configured in environment variables');
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_SECRET_NOT_CONFIGURED);
    }

    if (!signature) {
      this._logger.warn('Stripe webhook request missing stripe-signature header');
      throw new BadRequestException(ErrorCodes.STRIPE_WEBHOOK_SIGNATURE_MISSING);
    }

    try {
      const event = this._stripeClient.client.webhooks.constructEvent(rawBody, signature, webhookSecret);
      this._logger.debug(`Stripe webhook signature verified. Event ID: ${event.id}, Event Type: ${event.type}`);

      request.stripeEvent = event;
    } catch (error) {
      this._logger.warn(`Stripe webhook signature verification failed: ${(error as Error).message}`);
      throw new BadRequestException(ErrorCodes.STRIPE_WEBHOOK_SIGNATURE_INVALID);
    }

    return true;
  }
}
