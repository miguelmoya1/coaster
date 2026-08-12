import type { EstablishmentId } from '@coaster/common';
import type {
  DbEstablishmentSubscriptionUncheckedCreateInput,
  DbEstablishmentSubscriptionUncheckedUpdateInput,
} from '@coaster/core/db';
import { DbService } from '@coaster/core/db';
import { Injectable, Logger } from '@nestjs/common';

type CreateEstablishmentSubscriptionDto = Omit<
  DbEstablishmentSubscriptionUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'establishmentId' | 'createdAt' | 'updatedAt'
>;

type UpdateEstablishmentSubscriptionDto = Omit<
  DbEstablishmentSubscriptionUncheckedUpdateInput,
  'id' | 'createdAt' | 'updatedAt' | 'establishmentId' | 'createdAt' | 'updatedAt'
>;

function readId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

@Injectable()
export class EstablishmentSubscriptionWriteRepository {
  private readonly _logger = new Logger(EstablishmentSubscriptionWriteRepository.name);

  constructor(private readonly _db: DbService) {}

  public create(establishmentId: EstablishmentId, data: CreateEstablishmentSubscriptionDto) {
    return this._db.dbEstablishmentSubscription.create({ data: { ...data, establishmentId } });
  }

  public update(establishmentId: EstablishmentId, data: UpdateEstablishmentSubscriptionDto) {
    return this._db.dbEstablishmentSubscription.update({
      where: { establishmentId },
      data: { ...data, establishmentId },
    });
  }

  public upsert(
    establishmentId: EstablishmentId,
    create: CreateEstablishmentSubscriptionDto,
    update: UpdateEstablishmentSubscriptionDto,
  ) {
    return this._db.$transaction(async (tx) => {
      const stripeCustomerId = readId(create.stripeCustomerId ?? update.stripeCustomerId);
      const stripeSubscriptionId = readId(create.stripeSubscriptionId ?? update.stripeSubscriptionId);

      if (stripeCustomerId) {
        const conflicting = await tx.dbEstablishmentSubscription.findMany({
          where: { stripeCustomerId, establishmentId: { not: establishmentId } },
          select: { establishmentId: true },
        });

        if (conflicting.length > 0) {
          await tx.dbEstablishmentSubscription.updateMany({
            where: { stripeCustomerId, establishmentId: { not: establishmentId } },
            data: { stripeCustomerId: null },
          });
          this.#reportRelease('customer', stripeCustomerId, conflicting, establishmentId);
        }
      }

      if (stripeSubscriptionId) {
        const conflicting = await tx.dbEstablishmentSubscription.findMany({
          where: { stripeSubscriptionId, establishmentId: { not: establishmentId } },
          select: { establishmentId: true },
        });

        if (conflicting.length > 0) {
          await tx.dbEstablishmentSubscription.updateMany({
            where: { stripeSubscriptionId, establishmentId: { not: establishmentId } },
            data: { stripeSubscriptionId: null },
          });
          this.#reportRelease('subscription', stripeSubscriptionId, conflicting, establishmentId);
        }
      }

      return tx.dbEstablishmentSubscription.upsert({
        where: { establishmentId },
        create: { ...create, establishmentId },
        update: { ...update, establishmentId },
      });
    });
  }

  #reportRelease(
    kind: 'customer' | 'subscription',
    stripeId: string,
    released: { establishmentId: string }[],
    claimedBy: EstablishmentId,
  ): void {
    this._logger.error(
      `Stripe ${kind} ${stripeId} moved to establishmentId=${claimedBy} and was unlinked from ` +
        `${released.map((row) => row.establishmentId).join(', ')}. Those establishments may still be billed by Stripe while losing ` +
        `their billing link: check them by hand.`,
    );
  }
}
