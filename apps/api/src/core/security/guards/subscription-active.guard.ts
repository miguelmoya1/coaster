import { ErrorCodes } from '@coaster/common';
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DbRole, DbService, DbSubscriptionStatus } from '../../db';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../decorators/skip-subscription-check.decorator';

interface RequestWithParams {
  method: string;
  url?: string;
  params?: { barId?: string };
  user?: { id: string };
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

    if (request.user?.id) {
      const user = await this._db.dbUser.findUnique({ where: { id: request.user.id }, select: { role: true } });
      if (user?.role === DbRole.ADMIN) {
        return true;
      }
    }

    const sub = await this._db.dbBarSubscription.findUnique({
      where: { barId },
    });

    if (!sub) {
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

    const now = new Date();
    if (
      sub.status === DbSubscriptionStatus.ACTIVE &&
      sub.stripeSubscriptionId &&
      sub.currentPeriodEnd &&
      now <= sub.currentPeriodEnd
    ) {
      return true;
    }

    if (sub.status === DbSubscriptionStatus.TRIALING && sub.trialEndsAt && now <= sub.trialEndsAt) {
      return true;
    }

    if (sub.status === DbSubscriptionStatus.CANCELED && sub.currentPeriodEnd && now <= sub.currentPeriodEnd) {
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
}
