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
