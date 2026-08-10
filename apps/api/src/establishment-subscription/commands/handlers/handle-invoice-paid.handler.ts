import type { EstablishmentId } from '@coaster/common';
import { DbSubscriptionStatus } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { EstablishmentSubscriptionReadRepository } from '../../data-access/establishment-subscription.read.repository';
import { EstablishmentSubscriptionWriteRepository } from '../../data-access/establishment-subscription.write.repository';
import { SubscriptionRenewedEvent } from '../../events';
import { HandleInvoicePaidCommand } from '../impl/handle-invoice-paid.command';

const RECOVERABLE_STATUSES: DbSubscriptionStatus[] = [DbSubscriptionStatus.PAST_DUE, DbSubscriptionStatus.UNPAID];

@Injectable()
@CommandHandler(HandleInvoicePaidCommand)
export class HandleInvoicePaidHandler implements ICommandHandler<HandleInvoicePaidCommand, void> {
  private readonly _logger = new Logger(HandleInvoicePaidHandler.name);

  constructor(
    private readonly _readRepo: EstablishmentSubscriptionReadRepository,
    private readonly _writeRepo: EstablishmentSubscriptionWriteRepository,
    private readonly _eventBus: EventBus,
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
        `Invoice paid event ignored: no EstablishmentSubscription found for customerId=${stripeCustomerId}, subscriptionId=${stripeSubscriptionId}`,
      );
      return;
    }

    if (!RECOVERABLE_STATUSES.includes(existing.status)) {
      this._logger.debug(
        `Invoice paid for establishmentId=${existing.establishmentId}: status=${existing.status} does not need recovery`,
      );
      return;
    }

    this._logger.debug(
      `Recovering subscription for establishmentId=${existing.establishmentId} after successful invoice payment`,
    );
    await this._writeRepo.update(existing.establishmentId as EstablishmentId, { status: DbSubscriptionStatus.ACTIVE });

    this._eventBus.publish(
      new SubscriptionRenewedEvent(
        existing.establishmentId as EstablishmentId,
        stripeSubscriptionId ?? existing.stripeSubscriptionId ?? '',
        existing.currentPeriodEnd ?? undefined,
      ),
    );
  }
}
