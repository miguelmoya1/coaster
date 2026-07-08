import { ErrorCodes } from '@coaster/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DbRole } from '../../db';
import { SecurityRepository } from '../data-access/security.repository';
import { ADMIN_KEY } from '../decorators/admin.decorator';

interface RequestWithUser {
  user?: { id: string };
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private _reflector: Reflector,
    private _securityRepository: SecurityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAdminRequired = this._reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdminRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    const userRole = await this._securityRepository.getUserRole(user.id);

    if (userRole !== DbRole.ADMIN) {
      throw new ForbiddenException(ErrorCodes.UNAUTHORIZED);
    }

    return true;
  }
}
