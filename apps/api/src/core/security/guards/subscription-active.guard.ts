import { ErrorCodes } from '@coaster/common';
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getAuth } from 'firebase-admin/auth';
import { DbRole, DbService, DbSubscriptionStatus } from '../../db';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../decorators/skip-subscription-check.decorator';

interface RequestWithParams {
  method: string;
  url?: string;
  headers?: { authorization?: string };
  params?: { barId?: string };
  user?: { id: string };
}

interface SubscriptionState {
  status: DbSubscriptionStatus;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  trialEndsAt: Date | null;
}

const SUBSCRIPTION_MANAGEMENT_PATH = /\/bars\/[^/]+\/bar-subscription(\/|$)/;

function getPathname(url: string | undefined): string {
  if (!url) {
    return '';
  }

  const queryStart = url.indexOf('?');
  return queryStart === -1 ? url : url.slice(0, queryStart);
}

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  readonly #logger = new Logger(SubscriptionActiveGuard.name);

  constructor(
    private readonly _reflector: Reflector,
    private readonly _db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithParams>();
    const method = request.method?.toUpperCase();

    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const skipCheck = this._reflector.getAllAndOverride<boolean>(SKIP_SUBSCRIPTION_CHECK_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return true;
    }

    if (SUBSCRIPTION_MANAGEMENT_PATH.test(getPathname(request.url))) {
      return true;
    }

    const barId = request.params?.barId;
    if (!barId) {
      return true;
    }

    // One indexed lookup per write, reading only what the decision needs. Deliberately not cached:
    // a stale entry here either sells access the bar stopped paying for or locks out one that just
    // paid, and a primary-key read is not the thing to trade that against.
    const subscription = await this._db.dbBarSubscription.findUnique({
      where: { barId },
      select: { status: true, stripeSubscriptionId: true, currentPeriodEnd: true, trialEndsAt: true },
    });

    if (this.#grantsAccess(subscription)) {
      return true;
    }

    if (await this.#isPlatformAdmin(request)) {
      this.#logger.debug(`Letting a platform admin act on barId=${barId} despite its lapsed subscription`);
      return true;
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        error: 'Payment Required',
        message: ErrorCodes.SUBSCRIPTION_EXPIRED,
        errorCode: ErrorCodes.SUBSCRIPTION_EXPIRED,
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  #grantsAccess(subscription: SubscriptionState | null): boolean {
    if (!subscription) {
      return false;
    }

    const now = new Date();

    if (
      subscription.status === DbSubscriptionStatus.ACTIVE &&
      subscription.stripeSubscriptionId &&
      subscription.currentPeriodEnd &&
      now <= subscription.currentPeriodEnd
    ) {
      return true;
    }

    if (
      subscription.status === DbSubscriptionStatus.TRIALING &&
      subscription.trialEndsAt &&
      now <= subscription.trialEndsAt
    ) {
      return true;
    }

    // A cancellation scheduled for the end of the period still grants access until that date.
    return (
      subscription.status === DbSubscriptionStatus.CANCELED &&
      Boolean(subscription.currentPeriodEnd) &&
      now <= subscription.currentPeriodEnd!
    );
  }

  /**
   * Nest runs global guards ahead of the controller-level ones, so FirebaseAuthGuard has not put
   * the user on the request yet and the bearer token is the only identity reachable from here.
   * Resolved only once the subscription has already been rejected, so the ordinary request pays
   * nothing for it.
   */
  async #isPlatformAdmin(request: RequestWithParams): Promise<boolean> {
    if (request.user?.id) {
      const user = await this._db.dbUser.findUnique({ where: { id: request.user.id }, select: { role: true } });
      return user?.role === DbRole.ADMIN;
    }

    const token = this.#extractBearerToken(request);

    if (!token) {
      return false;
    }

    try {
      const decodedToken = await getAuth().verifyIdToken(token);

      if (!decodedToken?.sub) {
        return false;
      }

      const user = await this._db.dbUser.findUnique({
        where: { googleId: decodedToken.sub },
        select: { role: true },
      });

      return user?.role === DbRole.ADMIN;
    } catch {
      // A token this guard cannot read is the auth guard's business, and it runs right after.
      return false;
    }
  }

  #extractBearerToken(request: RequestWithParams): string | null {
    const header = request.headers?.authorization;

    if (typeof header !== 'string' || header.length === 0) {
      return null;
    }

    return header.replace(/^Bearer\s+/i, '');
  }
}
