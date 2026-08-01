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
import { DbService } from '../../core/db';
import { StripeClient } from '../stripe-client.provider';

export type FastifyStripeRequest = FastifyRequest & {
  rawBody?: string;
  stripeEvent?: Stripe.Event;
  stripeEventAlreadyProcessed?: boolean;
};

@Injectable()
export class StripeWebhookGuard implements CanActivate {
  private readonly _logger = new Logger(StripeWebhookGuard.name);

  constructor(
    private readonly _stripeClient: StripeClient,
    private readonly _configService: ConfigService,
    private readonly _db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this._logger.debug('Validating incoming Stripe webhook request...');
    const request = context.switchToHttp().getRequest<FastifyStripeRequest>();
    const signature = request.headers['stripe-signature'] as string | undefined;
    const rawBody = request.rawBody ?? '';

    const webhookSecret = this._configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      this._logger.error('STRIPE_WEBHOOK_SECRET is not configured in environment variables');
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not configured');
    }

    if (!signature) {
      this._logger.warn('Stripe webhook request missing stripe-signature header');
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: Stripe.Event;

    try {
      event = this._stripeClient.client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this._logger.warn(`Stripe webhook signature verification failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    this._logger.debug(`Stripe webhook signature verified. Event ID: ${event.id}, Event Type: ${event.type}`);

    const alreadyProcessed = await this._db.dbStripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    request.stripeEvent = event;
    request.stripeEventAlreadyProcessed = !!alreadyProcessed;

    if (alreadyProcessed) {
      this._logger.debug(`Stripe webhook event ${event.id} was already processed previously. Skipping handling.`);
    }

    return true;
  }
}
