import type { BarId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrinterWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async upsertPrinterConfig(barId: BarId, ipAddress: string, port?: number) {
    return this._db.dbPrinterConfig.upsert({
      where: { barId },
      update: {
        ipAddress,
        lastSeenAt: new Date(),
        ...(port === undefined ? {} : { port }),
      },
      create: {
        barId,
        ipAddress,
        lastSeenAt: new Date(),
        ...(port === undefined ? {} : { port }),
      },
    });
  }

  public async createPrinterConfig(barId: BarId) {
    return this._db.dbPrinterConfig.create({
      data: { barId },
    });
  }

  public async rotateDeviceKey(barId: BarId, deviceKey: string) {
    return this._db.dbPrinterConfig.update({
      where: { barId },
      data: { deviceKey },
    });
  }

  public async updateLastSeen(barId: BarId) {
    return this._db.dbPrinterConfig.update({
      where: { barId },
      data: { lastSeenAt: new Date() },
    });
  }
}
