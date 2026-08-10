import type { EstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrinterWriteRepository {
  constructor(private readonly _db: DbService) {}

  public async upsertPrinterConfig(establishmentId: EstablishmentId, ipAddress: string, port?: number) {
    return this._db.dbPrinterConfig.upsert({
      where: { establishmentId },
      update: {
        ipAddress,
        lastSeenAt: new Date(),
        ...(port === undefined ? {} : { port }),
      },
      create: {
        establishmentId,
        ipAddress,
        lastSeenAt: new Date(),
        ...(port === undefined ? {} : { port }),
      },
    });
  }

  public async createPrinterConfig(establishmentId: EstablishmentId) {
    return this._db.dbPrinterConfig.create({
      data: { establishmentId },
    });
  }

  public async rotateDeviceKey(establishmentId: EstablishmentId, deviceKey: string) {
    return this._db.dbPrinterConfig.update({
      where: { establishmentId },
      data: { deviceKey },
    });
  }

  public async updateLastSeen(establishmentId: EstablishmentId) {
    return this._db.dbPrinterConfig.update({
      where: { establishmentId },
      data: { lastSeenAt: new Date() },
    });
  }
}
