import { ErrorCodes } from '@coaster/common';
import { Controller, InternalServerErrorException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CheckStripeWebhookCommand } from '../commands';
import { StripeWebhookWriteRepository } from '../data-access';
import { type FastifyStripeRequest, StripeWebhookGuard } from '../guards/stripe-webhook.guard';

@Controller('stripe')
export class StripeWebhookController {
  private readonly _logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _webhookRepo: StripeWebhookWriteRepository,
  ) {}

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  async handleWebhook(@Req() request: FastifyStripeRequest): Promise<{ received: true }> {
    const event = request.stripeEvent;

    if (!event) {
      this._logger.warn('No Stripe event attached to request object');
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_EVENT_MISSING);
    }

    const shouldProcess = await this._webhookRepo.claim(event);

    if (!shouldProcess) {
      this._logger.debug(`Webhook event ${event.id} is already processed or currently being processed`);
      return { received: true };
    }

    this._logger.debug(`Receiving webhook and executing CheckStripeWebhookCommand for event type: ${event.type}`);

    try {
      await this._commandBus.execute(new CheckStripeWebhookCommand(event));
      await this._webhookRepo.markProcessed(event.id);
    } catch (error) {
      await this._webhookRepo.markFailed(event.id, error);
      throw error;
    }

    return { received: true };
  }
}
