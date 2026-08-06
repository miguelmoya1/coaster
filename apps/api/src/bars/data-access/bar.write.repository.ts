import type { UserId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import {
  DbBarRole,
  DbBarUncheckedCreateInput,
  DbService,
  DbSubscriptionPlan,
  DbSubscriptionStatus,
} from '../../core/db';

type CreateBarDto = Omit<
  DbBarUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'members' | 'shifts' | 'categories' | 'tables' | 'orders' | 'billing' | 'printer'
>;

@Injectable()
export class BarWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async create(userId: UserId, createBarDto: CreateBarDto) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    return this._db.dbBar.create({
      data: {
        ...createBarDto,
        members: { create: { userId, role: DbBarRole.OWNER } },
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
