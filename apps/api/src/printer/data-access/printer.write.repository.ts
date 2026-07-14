import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class PrinterWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async upsertPrinterConfig(barId: BarId, ipAddress: string) {
    return this._db.dbPrinterConfig.upsert({
      where: { barId },
      update: {
        ipAddress,
        lastSeenAt: new Date(),
      },
      create: {
        barId,
        ipAddress,
        lastSeenAt: new Date(),
      },
    });
  }

  public async createPrinterConfig(barId: BarId) {
    return this._db.dbPrinterConfig.create({
      data: { barId },
    });
  }

  public async updateLastSeen(barId: BarId) {
    return this._db.dbPrinterConfig.update({
      where: { barId },
      data: { lastSeenAt: new Date() },
    });
  }
}
