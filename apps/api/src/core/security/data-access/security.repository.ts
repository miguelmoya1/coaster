import { DEFAULT_ESTABLISHMENT_MODULES, EstablishmentModule, resolveModules } from '@coaster/common';
import { Injectable, Logger } from '@nestjs/common';
import { CacheKeys } from '../../cache/cache-keys';
import { CacheService } from '../../cache/cache.service';
import { DbRole, DbService, DbSubscriptionPlan, DbSubscriptionStatus } from '../../db';

export interface SubscriptionState {
  status: DbSubscriptionStatus;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
  manualPlan: DbSubscriptionPlan | null;
  manualGrantExpiresAt: Date | null;
}

@Injectable()
export class SecurityRepository {
  readonly #logger = new Logger(SecurityRepository.name);

  constructor(
    private readonly _db: DbService,
    private readonly _cache: CacheService,
  ) {}

  async getUserRole(userId: string): Promise<DbRole | undefined> {
    return this._cache.remember(CacheKeys.userRole(userId), async () => {
      const user = await this._db.dbUser.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      return user?.role;
    });
  }

  async getEstablishmentMemberRole(
    userId: string,
    establishmentId: string,
  ): Promise<{ role: string; active: boolean } | null> {
    return this._cache.remember(CacheKeys.membership(establishmentId, userId), () =>
      this._db.dbEstablishmentMember.findUnique({
        where: {
          userId_establishmentId: {
            userId,
            establishmentId,
          },
          deletedAt: null,
        },
        select: { role: true, active: true },
      }),
    );
  }

  async getEnabledModules(establishmentId: string): Promise<EstablishmentModule[]> {
    return this._cache.remember(CacheKeys.modules(establishmentId), async () => {
      const settings = await this._db.dbEstablishmentSettings.findUnique({
        where: { establishmentId },
        select: { modules: true },
      });

      if (!settings) {
        this.#logger.warn(`Establishment ${establishmentId} has no settings row; assuming every module is on`);
        return resolveModules(DEFAULT_ESTABLISHMENT_MODULES);
      }

      return resolveModules(settings.modules as EstablishmentModule[]);
    });
  }

  async getSubscriptionState(establishmentId: string): Promise<SubscriptionState | null> {
    return this._cache.remember(CacheKeys.subscription(establishmentId), () =>
      this._db.dbEstablishmentSubscription.findUnique({
        where: { establishmentId },
        select: {
          status: true,
          stripeSubscriptionId: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          manualPlan: true,
          manualGrantExpiresAt: true,
        },
      }),
    );
  }

  async isOnTrial(establishmentId: string): Promise<boolean> {
    const subscription = await this.getSubscriptionState(establishmentId);

    return subscription?.status === DbSubscriptionStatus.TRIALING;
  }
}
