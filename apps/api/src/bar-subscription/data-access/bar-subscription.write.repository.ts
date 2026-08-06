import type { BarId } from '@coaster/common';
import type { DbBarSubscriptionUncheckedCreateInput, DbBarSubscriptionUncheckedUpdateInput } from '@coaster/core/db';
import { DbService } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';

type CreateBarSubscriptionDto = Omit<
  DbBarSubscriptionUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'barId' | 'createdAt' | 'updatedAt'
>;

type UpdateBarSubscriptionDto = Omit<
  DbBarSubscriptionUncheckedUpdateInput,
  'id' | 'createdAt' | 'updatedAt' | 'barId' | 'createdAt' | 'updatedAt'
>;

function readId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

@Injectable()
export class BarSubscriptionWriteRepository {
  private readonly _logger = new Logger(BarSubscriptionWriteRepository.name);

  constructor(private readonly _db: DbService) {}

  public create(barId: BarId, data: CreateBarSubscriptionDto) {
    return this._db.dbBarSubscription.create({ data: { ...data, barId } });
  }

  public update(barId: BarId, data: UpdateBarSubscriptionDto) {
    return this._db.dbBarSubscription.update({
      where: { barId },
      data: { ...data, barId },
    });
  }

  public upsert(barId: BarId, create: CreateBarSubscriptionDto, update: UpdateBarSubscriptionDto) {
    return this._db.$transaction(async (tx) => {
      const stripeCustomerId = readId(create.stripeCustomerId ?? update.stripeCustomerId);
      const stripeSubscriptionId = readId(create.stripeSubscriptionId ?? update.stripeSubscriptionId);

      if (stripeCustomerId) {
        const conflicting = await tx.dbBarSubscription.findMany({
          where: { stripeCustomerId, barId: { not: barId } },
          select: { barId: true },
        });

        if (conflicting.length > 0) {
          await tx.dbBarSubscription.updateMany({
            where: { stripeCustomerId, barId: { not: barId } },
            data: { stripeCustomerId: null },
          });
          this.#reportRelease('customer', stripeCustomerId, conflicting, barId);
        }
      }

      if (stripeSubscriptionId) {
        const conflicting = await tx.dbBarSubscription.findMany({
          where: { stripeSubscriptionId, barId: { not: barId } },
          select: { barId: true },
        });

        if (conflicting.length > 0) {
          await tx.dbBarSubscription.updateMany({
            where: { stripeSubscriptionId, barId: { not: barId } },
            data: { stripeSubscriptionId: null },
          });
          this.#reportRelease('subscription', stripeSubscriptionId, conflicting, barId);
        }
      }

      return tx.dbBarSubscription.upsert({
        where: { barId },
        create: { ...create, barId },
        update: { ...update, barId },
      });
    });
  }

  /**
   * Unlinking is the only way to honour the unique index, but the bar that loses the reference is
   * still being billed by Stripe and now has no way back to its own portal. Nothing downstream
   * notices, so this is the one record that it happened.
   */
  #reportRelease(
    kind: 'customer' | 'subscription',
    stripeId: string,
    released: { barId: string }[],
    claimedBy: BarId,
  ): void {
    this._logger.error(
      `Stripe ${kind} ${stripeId} moved to barId=${claimedBy} and was unlinked from ` +
        `${released.map((row) => row.barId).join(', ')}. Those bars may still be billed by Stripe while losing ` +
        `their billing link: check them by hand.`,
    );
  }
}
