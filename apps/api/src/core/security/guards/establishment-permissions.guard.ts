import { EstablishmentPermission, ErrorCodes, asEstablishmentRole, hasPermission } from '@coaster/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DbRole } from '../../db';
import { SecurityRepository } from '../data-access/security.repository';
import { ESTABLISHMENT_PERMISSIONS_KEY } from '../decorators/establishment-permissions.decorator';

interface RequestWithUser {
  user: { id: string };
  params: { establishmentId: string };
}

@Injectable()
export class EstablishmentPermissionsGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _securityRepository: SecurityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this._reflector.getAllAndOverride<EstablishmentPermission[]>(
      ESTABLISHMENT_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    const establishmentId = request.params?.establishmentId;

    if (!requiredPermissions && !establishmentId) {
      return true;
    }

    if (!user) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    const userRole = await this._securityRepository.getUserRole(user.id);

    if (userRole === DbRole.ADMIN) {
      return true;
    }

    if (!establishmentId) {
      throw new ForbiddenException(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    const membership = await this._securityRepository.getEstablishmentMemberRole(user.id, establishmentId);

    if (!membership || !membership.active) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const role = asEstablishmentRole(membership.role);
      const hasAllPermissions = requiredPermissions.every((permission) => hasPermission(role, permission));

      if (!hasAllPermissions) {
        throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
      }
    }

    return true;
  }
}
