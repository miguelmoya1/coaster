import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BillingWriteRepository } from '../../data-access/billing.write.repository';
import { RecordStripeWebhookEventCommand } from '../impl/record-stripe-webhook-event.command';

@Injectable()
@CommandHandler(RecordStripeWebhookEventCommand)
export class RecordStripeWebhookEventHandler implements ICommandHandler<RecordStripeWebhookEventCommand, void> {
  constructor(private readonly _writeRepo: BillingWriteRepository) {}

  async execute(command: RecordStripeWebhookEventCommand): Promise<void> {
    const { event } = command;
    await this._writeRepo.recordStripeWebhookEvent(event.id, event.type, event);
  }
}
