import type { BarId } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import type { DbBarSubscriptionUncheckedCreateInput, DbBarSubscriptionUncheckedUpdateInput } from '../../core/db';
import { DbService } from '../../core/db';

type CreateBarSubscriptionDto = Omit<
  DbBarSubscriptionUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'barId' | 'createdAt' | 'updatedAt'
>;

type UpdateBarSubscriptionDto = Omit<
  DbBarSubscriptionUncheckedUpdateInput,
  'id' | 'createdAt' | 'updatedAt' | 'barId' | 'createdAt' | 'updatedAt'
>;

/** Prisma accepts either a bare value or an update-operation object; only bare ids concern us. */
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

  /**
   * `stripeCustomerId` and `stripeSubscriptionId` are globally unique, so a Stripe id that moved
   * to another bar would make this write fail with P2002 — and since webhooks retry, it would
   * fail forever. Stripe is the source of truth for who owns an id, so any stale reference on a
   * different bar is released first and the whole thing runs in one transaction.
   */
  public upsert(barId: BarId, create: CreateBarSubscriptionDto, update: UpdateBarSubscriptionDto) {
    return this._db.$transaction(async (tx) => {
      const stripeCustomerId = readId(create.stripeCustomerId ?? update.stripeCustomerId);
      const stripeSubscriptionId = readId(create.stripeSubscriptionId ?? update.stripeSubscriptionId);

      if (stripeCustomerId) {
        const released = await tx.dbBarSubscription.updateMany({
          where: { stripeCustomerId, barId: { not: barId } },
          data: { stripeCustomerId: null },
        });

        if (released.count > 0) {
          this._logger.warn(
            `Released Stripe customer ${stripeCustomerId} from ${released.count} other bar(s) before linking it to barId=${barId}`,
          );
        }
      }

      if (stripeSubscriptionId) {
        const released = await tx.dbBarSubscription.updateMany({
          where: { stripeSubscriptionId, barId: { not: barId } },
          data: { stripeSubscriptionId: null },
        });

        if (released.count > 0) {
          this._logger.warn(
            `Released Stripe subscription ${stripeSubscriptionId} from ${released.count} other bar(s) before linking it to barId=${barId}`,
          );
        }
      }

      return tx.dbBarSubscription.upsert({
        where: { barId },
        create: { ...create, barId },
        update: { ...update, barId },
      });
    });
  }
}
