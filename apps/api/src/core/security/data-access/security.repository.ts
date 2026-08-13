import { DEFAULT_ESTABLISHMENT_MODULES, EstablishmentModule, resolveModules } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { DbRole, DbService, DbSubscriptionStatus } from '../../db';

@Injectable()
export class SecurityRepository {
  readonly #logger = new Logger(SecurityRepository.name);

  constructor(private readonly _db: DbService) {}

  async getUserRole(userId: string): Promise<DbRole | undefined> {
    const user = await this._db.dbUser.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role;
  }

  async getEstablishmentMemberRole(
    userId: string,
    establishmentId: string,
  ): Promise<{ role: string; active: boolean } | null> {
    const membership = await this._db.dbEstablishmentMember.findUnique({
      where: {
        userId_establishmentId: {
          userId,
          establishmentId,
        },
        deletedAt: null,
      },
      select: { role: true, active: true },
    });

    return membership;
  }

  async getEnabledModules(establishmentId: string): Promise<EstablishmentModule[]> {
    const settings = await this._db.dbEstablishmentSettings.findUnique({
      where: { establishmentId },
      select: { modules: true },
    });

    if (!settings) {
      this.#logger.warn(`Establishment ${establishmentId} has no settings row; assuming every module is on`);
      return resolveModules(DEFAULT_ESTABLISHMENT_MODULES);
    }

    return resolveModules(settings.modules as EstablishmentModule[]);
  }

  async isOnTrial(establishmentId: string): Promise<boolean> {
    const billing = await this._db.dbEstablishmentSubscription.findUnique({
      where: { establishmentId },
      select: { status: true },
    });

    return billing?.status === DbSubscriptionStatus.TRIALING;
  }
}
