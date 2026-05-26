import { asRole, ErrorCodes, Role } from '@coaster/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/services/prisma.service';
import { USER_ROLES_KEY } from '../decorators/user-roles.decorator';

interface RequestWithUser {
  user: { id: string };
}

@Injectable()
export class UserRolesGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this._reflector.getAllAndOverride<Role[]>(USER_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    const dbUser = await this._prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });

    if (!dbUser) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    const userRole = asRole(dbUser.role);

    const hasRole = requiredRoles.includes(userRole);

    if (!hasRole) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    return true;
  }
}
