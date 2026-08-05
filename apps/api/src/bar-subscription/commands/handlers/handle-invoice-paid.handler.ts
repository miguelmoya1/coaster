import type { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DbSubscriptionStatus } from '../../../core/db';
import { BarSubscriptionReadRepository } from '../../data-access/bar-subscription.read.repository';
import { BarSubscriptionWriteRepository } from '../../data-access/bar-subscription.write.repository';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';

const RECOVERABLE_STATUSES: DbSubscriptionStatus[] = [DbSubscriptionStatus.PAST_DUE, DbSubscriptionStatus.UNPAID];

@Injectable()
@CommandHandler(HandleInvoicePaidCommand)
export class HandleInvoicePaidHandler implements ICommandHandler<HandleInvoicePaidCommand, void> {
  private readonly _logger = new Logger(HandleInvoicePaidHandler.name);

  constructor(
    private readonly _readRepo: BarSubscriptionReadRepository,
    private readonly _writeRepo: BarSubscriptionWriteRepository,
  ) {}

  async execute(command: HandleInvoicePaidCommand): Promise<void> {
    const { invoice } = command;
    const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?.id ?? null);
    const rawSubscription = invoice.parent?.subscription_details?.subscription;
    const stripeSubscriptionId = typeof rawSubscription === 'string' ? rawSubscription : (rawSubscription?.id ?? null);

    if (!stripeCustomerId && !stripeSubscriptionId) {
      this._logger.debug(`Invoice paid event ignored: missing customerId and subscriptionId for ${invoice.id}`);
      return;
    }

    const existing = stripeSubscriptionId
      ? await this._readRepo.findByStripeSubscriptionId(stripeSubscriptionId)
      : await this._readRepo.findByStripeCustomerId(stripeCustomerId!);

    if (!existing) {
      this._logger.debug(
        `Invoice paid event ignored: no BarSubscription found for customerId=${stripeCustomerId}, subscriptionId=${stripeSubscriptionId}`,
      );
      return;
    }

    if (!RECOVERABLE_STATUSES.includes(existing.status)) {
      this._logger.debug(`Invoice paid for barId=${existing.barId}: status=${existing.status} does not need recovery`);
      return;
    }

    this._logger.debug(`Recovering subscription for barId=${existing.barId} after successful invoice payment`);
    await this._writeRepo.update(existing.barId as BarId, { status: DbSubscriptionStatus.ACTIVE });
  }
}
