import type { BarId, PrintTicketPayloadDto } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

const STALE_CLAIM_MS = 2 * 60 * 1000;

const MAX_ATTEMPTS = 3;

@Injectable()
export class PrintJobRepository {
  constructor(private readonly _db: DbService) {}

  public async enqueue(barId: BarId, payload: PrintTicketPayloadDto) {
    return this._db.dbPrintJob.create({
      data: { barId, payload: JSON.parse(JSON.stringify(payload)) },
    });
  }

  public async findById(id: string) {
    return this._db.dbPrintJob.findUnique({ where: { id } });
  }

  public async claimNext(barId: BarId) {
    const candidate = await this._db.dbPrintJob.findFirst({
      where: { barId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (!candidate) {
      return null;
    }

    const { count } = await this._db.dbPrintJob.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PRINTING', claimedAt: new Date(), attempts: { increment: 1 } },
    });

    if (count === 0) {
      return null;
    }

    return { ...candidate, attempts: candidate.attempts + 1 };
  }

  public async complete(id: string) {
    return this._db.dbPrintJob.updateMany({
      where: { id, status: 'PRINTING' },
      data: { status: 'PRINTED', completedAt: new Date(), error: null },
    });
  }

  public async fail(id: string, error: string) {
    return this._db.dbPrintJob.updateMany({
      where: { id, status: 'PRINTING' },
      data: { status: 'FAILED', completedAt: new Date(), error: error.slice(0, 500) },
    });
  }

  public async requeueStaleClaims(barId: BarId) {
    const cutoff = new Date(Date.now() - STALE_CLAIM_MS);

    await this._db.dbPrintJob.updateMany({
      where: { barId, status: 'PRINTING', claimedAt: { lt: cutoff }, attempts: { lt: MAX_ATTEMPTS } },
      data: { status: 'PENDING', claimedAt: null },
    });

    await this._db.dbPrintJob.updateMany({
      where: { barId, status: 'PRINTING', claimedAt: { lt: cutoff }, attempts: { gte: MAX_ATTEMPTS } },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: 'The print bridge stopped responding while printing this ticket',
      },
    });
  }
}
