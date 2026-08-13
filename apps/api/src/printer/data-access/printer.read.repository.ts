import type { EstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PrinterReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByEstablishmentId(establishmentId: EstablishmentId) {
    return this._db.dbPrinterConfig.findUnique({
      where: { establishmentId },
    });
  }

  public async findEstablishmentById(establishmentId: EstablishmentId) {
    return this._db.dbEstablishment.findUnique({
      where: { id: establishmentId },
      select: { id: true, name: true },
    });
  }
}
