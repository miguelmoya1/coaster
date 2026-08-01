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
    const request = context.switchToHttp().getRequest<FastifyStripeRequest>();
    const signature = request.headers['stripe-signature'] as string | undefined;
    const rawBody = request.rawBody ?? '';

    const webhookSecret = this._configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not configured');
    }

    if (!signature) {
      throw new BadRequestException('Missing Stripe signature header');
    }

    let event: Stripe.Event;

    try {
      event = this._stripeClient.client.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error) {
      this._logger.warn(`Stripe webhook signature verification failed: ${(error as Error).message}`);
      throw new BadRequestException('Invalid Stripe signature');
    }

    const alreadyProcessed = await this._db.dbStripeWebhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    request.stripeEvent = event;
    request.stripeEventAlreadyProcessed = !!alreadyProcessed;

    return true;
  }
}
