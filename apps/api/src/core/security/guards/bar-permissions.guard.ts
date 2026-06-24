import type { BarPermission } from '@coaster/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '../../constants';
import { DbRole } from '../../db';
import { hasPermission } from '../../permissions/bar-member.security';
import { asBarRole } from '../../utils/brands';
import { SecurityRepository } from '../data-access/security.repository';
import { BAR_PERMISSIONS_KEY } from '../decorators/bar-permissions.decorator';

interface RequestWithUser {
  user: { id: string };
  params: { barId: string };
}

@Injectable()
export class BarPermissionsGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _securityRepository: SecurityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this._reflector.getAllAndOverride<BarPermission[]>(BAR_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const barId = request.params?.barId;

    if (!requiredPermissions && !barId) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    const userRole = await this._securityRepository.getUserRole(user.id);

    if (userRole === DbRole.ADMIN) {
      return true;
    }

    if (!barId) {
      throw new ForbiddenException(ErrorCodes.MISSING_BAR_ID);
    }

    const membership = await this._securityRepository.getBarMemberRole(user.id, barId);

    if (!membership || !membership.active) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const role = asBarRole(membership.role);
      const hasAllPermissions = requiredPermissions.every((permission) => hasPermission(role, permission));

      if (!hasAllPermissions) {
        throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
      }
    }

    return true;
  }
}
