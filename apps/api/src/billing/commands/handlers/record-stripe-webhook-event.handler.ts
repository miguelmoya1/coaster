import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { RecordStripeWebhookEventCommand } from '../impl/record-stripe-webhook-event.command';

@Injectable()
@CommandHandler(RecordStripeWebhookEventCommand)
export class RecordStripeWebhookEventHandler implements ICommandHandler<RecordStripeWebhookEventCommand, void> {
  private readonly _logger = new Logger(RecordStripeWebhookEventHandler.name);

  constructor(private readonly _writeRepo: BillingWriteRepository) {}

  async execute(command: RecordStripeWebhookEventCommand): Promise<void> {
    const { event } = command;
    const shouldProcess = await this._writeRepo.claimStripeWebhookEvent(event);
    if (!shouldProcess) return;

    this._logger.debug(`Processing webhook event: eventId=${event.id}, type=${event.type}`);
    try {
      await this._writeRepo.markStripeWebhookEventProcessed(event.id);
    } catch (error) {
      await this._writeRepo.markStripeWebhookEventFailed(event.id, error);
      throw error;
    }
  }
}
