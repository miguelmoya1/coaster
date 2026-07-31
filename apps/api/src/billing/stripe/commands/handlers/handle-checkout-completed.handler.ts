import { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BillingWriteRepository } from '../../../data-access/billing.write.repository';
import { HandleCheckoutCompletedCommand } from '../impl/handle-checkout-completed.command';

@Injectable()
@CommandHandler(HandleCheckoutCompletedCommand)
export class HandleCheckoutCompletedHandler implements ICommandHandler<HandleCheckoutCompletedCommand, void> {
  constructor(private readonly _writeRepo: BillingWriteRepository) {}

  async execute(command: HandleCheckoutCompletedCommand): Promise<void> {
    const { session } = command;

    if (session.mode !== 'subscription') {
      return;
    }

    const barId = (session.metadata?.barId || session.client_reference_id) as BarId | undefined;
    const customerId = typeof session.customer === 'string' ? session.customer : null;
    const stripeSubscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    if (!barId || !customerId) {
      return;
    }

    await this._writeRepo.upsertBarCustomerId(barId, customerId, stripeSubscriptionId);
  }
}
