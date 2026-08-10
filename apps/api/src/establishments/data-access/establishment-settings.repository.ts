import type { EstablishmentId, EstablishmentModule } from '@coaster/common';
import { resolveModules } from '@coaster/common';
import { DbEstablishmentModule, DbService } from '@coaster/core/db';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EstablishmentSettingsRepository {
  constructor(private readonly _db: DbService) {}

  public find(establishmentId: EstablishmentId) {
    return this._db.dbEstablishmentSettings.findUnique({ where: { establishmentId } });
  }

  /**
   * Answering the questions is what marks an establishment as configured, so the first write also
   * closes the onboarding.
   */
  public update(establishmentId: EstablishmentId, modules: EstablishmentModule[]) {
    const resolved = resolveModules(modules) as DbEstablishmentModule[];

    return this._db.dbEstablishmentSettings.upsert({
      where: { establishmentId },
      create: { establishmentId, modules: resolved, configuredAt: new Date() },
      update: { modules: resolved, configuredAt: { set: new Date() } },
    });
  }

  /**
   * Support changing a module is not the owner answering the onboarding, so this deliberately
   * leaves configuredAt alone: an establishment nobody has set up yet still gets its welcome.
   */
  public updateAsAdmin(establishmentId: EstablishmentId, modules: EstablishmentModule[]) {
    const resolved = resolveModules(modules) as DbEstablishmentModule[];

    return this._db.dbEstablishmentSettings.upsert({
      where: { establishmentId },
      create: { establishmentId, modules: resolved },
      update: { modules: resolved },
    });
  }
}
