import { ErrorCodes } from '@coaster/common';
import { Controller, InternalServerErrorException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CheckStripeWebhookCommand } from '../commands';
import { type FastifyStripeRequest, StripeWebhookGuard } from '../guards/stripe-webhook.guard';

@Controller('stripe')
export class StripeWebhookController {
  private readonly _logger = new Logger(StripeWebhookController.name);

  constructor(private readonly _commandBus: CommandBus) {}

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  async handleWebhook(@Req() request: FastifyStripeRequest): Promise<{ received: true }> {
    const event = request.stripeEvent;

    if (!event) {
      this._logger.warn('No Stripe event attached to request object');
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_EVENT_MISSING);
    }

    this._logger.debug(`Receiving webhook and executing CheckStripeWebhookCommand for event type: ${event.type}`);
    await this._commandBus.execute(new CheckStripeWebhookCommand(event));

    return { received: true };
  }
}
