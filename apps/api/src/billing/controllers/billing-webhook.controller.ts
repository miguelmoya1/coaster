import { ErrorCodes } from '@coaster/common';
import { Controller, InternalServerErrorException, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { type FastifyStripeRequest, StripeWebhookGuard } from '../../stripe';
import {
  HandleCheckoutCompletedCommand,
  HandleInvoicePaidCommand,
  HandleInvoicePaymentFailedCommand,
  HandleSubscriptionChangedCommand,
} from '../commands';
import { BillingWriteRepository } from '../data-access/billing.write.repository';

@Controller('billing')
export class BillingWebhookController {
  private readonly _logger = new Logger(BillingWebhookController.name);

  constructor(
    private readonly _commandBus: CommandBus,
    private readonly _writeRepo: BillingWriteRepository,
  ) {}

  @Post('webhook')
  @UseGuards(StripeWebhookGuard)
  async handleWebhook(@Req() request: FastifyStripeRequest): Promise<{ received: true }> {
    const event = request.stripeEvent;

    if (!event) {
      this._logger.warn('No Stripe event attached to request object');
      throw new InternalServerErrorException(ErrorCodes.STRIPE_WEBHOOK_EVENT_MISSING);
    }

    const shouldProcess = await this._writeRepo.claimStripeWebhookEvent(event);
    if (!shouldProcess) {
      this._logger.debug(`Webhook event ${event.id} is already processed or currently being processed`);
      return { received: true };
    }

    this._logger.debug(`Dispatching command for webhook event type: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          await this._commandBus.execute(new HandleCheckoutCompletedCommand(event.data.object));
          break;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
        case 'customer.subscription.paused':
        case 'customer.subscription.resumed': {
          await this._commandBus.execute(new HandleSubscriptionChangedCommand(event.data.object));
          break;
        }
        case 'invoice.payment_failed': {
          await this._commandBus.execute(new HandleInvoicePaymentFailedCommand(event.data.object));
          break;
        }
        case 'invoice.paid': {
          await this._commandBus.execute(new HandleInvoicePaidCommand(event.data.object));
          break;
        }
        default:
          this._logger.debug(`Unhandled webhook event type: ${event.type}`);
          break;
      }

      await this._writeRepo.markStripeWebhookEventProcessed(event.id);
    } catch (error) {
      await this._writeRepo.markStripeWebhookEventFailed(event.id, error);
      throw error;
    }

    return { received: true };
  }
}
