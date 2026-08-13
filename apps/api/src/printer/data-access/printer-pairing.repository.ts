import type { EstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';
import { newPairingCode, pairingExpiry } from '../domain/pairing-code';

@Injectable()
export class PrinterPairingRepository {
  constructor(private readonly _db: DbService) {}

  public async issue(establishmentId: EstablishmentId): Promise<string> {
    const code = newPairingCode();

    await this._db.dbPrinterPairing.create({
      data: { code, establishmentId, expiresAt: pairingExpiry() },
    });

    return code;
  }

  public async redeem(code: string, now = new Date()): Promise<{ establishmentId: string } | null> {
    const claimed = await this._db.dbPrinterPairing.updateMany({
      where: { code, redeemedAt: null, expiresAt: { gt: now } },
      data: { redeemedAt: now },
    });

    if (claimed.count === 0) {
      return null;
    }

    const pairing = await this._db.dbPrinterPairing.findUnique({
      where: { code },
      select: { establishmentId: true },
    });

    return pairing;
  }
}
