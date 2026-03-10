import { asBarRole, BarRole } from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/services/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this._reflector.getAllAndOverride<BarRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const barId = request.params.barId;

    if (!user) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    if (!barId) {
      throw new ForbiddenException(ErrorCodes.MISSING_BAR_ID);
    }

    const membership = await this._prisma.barMember.findUnique({
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

    const hasRole = requiredRoles.includes(asBarRole(membership.role));

    if (!hasRole) {
      throw new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND);
    }

    return true;
  }
}
