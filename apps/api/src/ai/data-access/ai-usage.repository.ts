import type { EstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

export const periodOf = (now: Date): string => now.toISOString().slice(0, 7);

@Injectable()
export class AiUsageRepository {
  constructor(private readonly _db: DbService) {}

  public async messagesThisPeriod(establishmentId: EstablishmentId, now = new Date()): Promise<number> {
    const usage = await this._db.dbAiUsage.findUnique({
      where: { establishmentId_period: { establishmentId, period: periodOf(now) } },
      select: { messages: true },
    });

    return usage?.messages ?? 0;
  }

  /** Incremented in the database rather than read-then-write, so two devices talking at once cannot both win. */
  public async countMessage(establishmentId: EstablishmentId, now = new Date()): Promise<number> {
    const period = periodOf(now);

    const usage = await this._db.dbAiUsage.upsert({
      where: { establishmentId_period: { establishmentId, period } },
      create: { establishmentId, period, messages: 1 },
      update: { messages: { increment: 1 } },
      select: { messages: true },
    });

    return usage.messages;
  }
}
