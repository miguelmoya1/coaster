import type { BarPermission } from '@coaster/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { asBarRole, ErrorCodes, hasPermission } from '../..';
import { DbService } from '../../../db';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

interface RequestWithUser {
  user: { id: string };
  params: { barId: string };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _prisma: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this._reflector.getAllAndOverride<BarPermission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const barId = request.params.barId;

    // If no permissions are specified and there is no barId parameter,
    // this route doesn't require bar-specific permission/membership verification.
    if (!requiredPermissions && !barId) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    if (!barId) {
      throw new ForbiddenException(ErrorCodes.MISSING_BAR_ID);
    }

    const membership = await this._prisma.dbBarMember.findUnique({
      where: {
        userId_barId: {
          userId: user.id,
          barId: barId,
        },
      },
    });

    if (!membership || !membership.active) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const role = asBarRole(membership.role);
      const hasAllPermissions = requiredPermissions.every((permission) => hasPermission(role, permission));

      if (!hasAllPermissions) {
        throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
      }
    }

    return true;
  }
}
