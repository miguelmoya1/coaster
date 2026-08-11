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

  /**
   * Every establishment gets its settings row on creation and the migration backfilled the rest, so
   * a missing row is an anomaly rather than a state to design for. Opening up rather than locking
   * down is the kinder failure: this decides which features a venue has, not who is allowed in, and
   * a venue silently losing its till is worse than one that keeps working.
   */
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

  /** Whether nobody is paying for this establishment yet, which earns it a smaller assistant allowance. */
  async isOnTrial(establishmentId: string): Promise<boolean> {
    const billing = await this._db.dbEstablishmentSubscription.findUnique({
      where: { establishmentId },
      select: { status: true },
    });

    return billing?.status === DbSubscriptionStatus.TRIALING;
  }
}
