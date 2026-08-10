import type { UserId } from '@coaster/common';
import {
  DbEstablishmentRole,
  DbEstablishmentUncheckedCreateInput,
  DbService,
  DbSubscriptionPlan,
  DbSubscriptionStatus,
} from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

type CreateEstablishmentDto = Omit<
  DbEstablishmentUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'members' | 'shifts' | 'categories' | 'tables' | 'orders' | 'billing' | 'printer'
>;

@Injectable()
export class EstablishmentWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(userId: UserId, createEstablishmentDto: CreateEstablishmentDto) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return this._db.dbEstablishment.create({
      data: {
        ...createEstablishmentDto,
        members: { create: { userId, role: DbEstablishmentRole.OWNER } },
        billing: {
          create: {
            plan: DbSubscriptionPlan.FREE,
            status: DbSubscriptionStatus.TRIALING,
            trialEndsAt,
          },
        },
      },
    });
  }
}
