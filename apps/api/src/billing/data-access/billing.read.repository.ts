import type { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class BillingReadRepository {
  private readonly _logger = new Logger(BillingReadRepository.name);

  constructor(private readonly _db: DbService) {}

  public async findSubscriptionByBarId(barId: BarId) {
    this._logger.debug(`findSubscriptionByBarId: barId=${barId}`);
    return this._db.dbBarSubscription.findUnique({
      where: { barId },
    });
  }

  public async findSubscriptionByStripeIds(stripeSubscriptionId: string, stripeCustomerId: string) {
    this._logger.debug(
      `findSubscriptionByStripeIds: stripeSubscriptionId=${stripeSubscriptionId}, stripeCustomerId=${stripeCustomerId}`,
    );
    const bySub = await this._db.dbBarSubscription.findFirst({
      where: { stripeSubscriptionId },
    });

    if (bySub) {
      return bySub;
    }

    return this._db.dbBarSubscription.findFirst({
      where: { stripeCustomerId },
    });
  }

  public async findSubscriptionsByStripeIds(subscriptionId?: string | null, customerId?: string | null) {
    if (!subscriptionId && !customerId) {
      return [];
    }

    this._logger.debug(`findSubscriptionsByStripeIds: subscriptionId=${subscriptionId}, customerId=${customerId}`);
    const where = subscriptionId ? { stripeSubscriptionId: subscriptionId } : { stripeCustomerId: customerId! };

    return this._db.dbBarSubscription.findMany({
      where,
      select: { barId: true },
    });
  }

  public async findWebhookEventById(stripeEventId: string) {
    this._logger.debug(`findWebhookEventById: stripeEventId=${stripeEventId}`);
    return this._db.dbStripeWebhookEvent.findUnique({
      where: { stripeEventId },
    });
  }

  public async findBarById(barId: BarId) {
    this._logger.debug(`findBarById: barId=${barId}`);
    return this._db.dbBar.findUnique({
      where: { id: barId },
    });
  }
}
