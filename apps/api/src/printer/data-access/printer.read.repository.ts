import type { BarId } from '@coaster/common';
import { Injectable } from '@nestjs/common';
import { DbService } from '../../core/db';

@Injectable()
export class PrinterReadRepository {
  constructor(private readonly _db: DbService) {}

  public async findByBarId(barId: BarId) {
    return this._db.dbPrinterConfig.findUnique({
      where: { barId },
    });
  }

  public async findBarById(barId: BarId) {
    return this._db.dbBar.findUnique({
      where: { id: barId },
      select: { id: true, name: true },
    });
  }
}
