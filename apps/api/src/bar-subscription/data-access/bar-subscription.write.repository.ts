import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
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

@Injectable()
export class BarSubscriptionWriteRepository {
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
    return this._db.dbBarSubscription.upsert({
      where: { barId },
      create: { ...create, barId },
      update: { ...update, barId },
    });
  }
}
