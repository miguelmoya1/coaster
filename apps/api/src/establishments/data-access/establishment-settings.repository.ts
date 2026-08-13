import type { EstablishmentId, EstablishmentModule, Language } from '@coaster/common';
import { resolveModules } from '@coaster/common';
import { DbEstablishmentModule, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EstablishmentSettingsRepository {
  constructor(private readonly _db: DbService) {}

  public find(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentSettings.findUnique({ where: { establishmentId } });
  }

  public update(
    establishmentId: EstablishmentId,
    modules: EstablishmentModule[],
    language?: Language,
    markSoldOut?: boolean,
  ) {
    const resolved = resolveModules(modules) as DbEstablishmentModule[];

    return this._db.dbEstablishmentSettings.upsert({
      where: { establishmentId },
      create: {
        establishmentId,
        modules: resolved,
        configuredAt: new Date(),
        ...(language && { language }),
        ...(markSoldOut !== undefined && { markSoldOut }),
      },
      update: {
        modules: resolved,
        configuredAt: { set: new Date() },
        ...(language && { language }),
        ...(markSoldOut !== undefined && { markSoldOut }),
      },
    });
  }

  public updateAsAdmin(establishmentId: EstablishmentId, modules: EstablishmentModule[]) {
    const resolved = resolveModules(modules) as DbEstablishmentModule[];

    return this._db.dbEstablishmentSettings.upsert({
      where: { establishmentId },
      create: { establishmentId, modules: resolved },
      update: { modules: resolved },
    });
  }
}
