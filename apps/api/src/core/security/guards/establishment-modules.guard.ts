import { EstablishmentModule, ErrorCodes } from '@coaster/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SecurityRepository } from '../data-access/security.repository';
import { ESTABLISHMENT_MODULES_KEY } from '../decorators/establishment-modules.decorator';

interface RequestWithEstablishment {
  params: { establishmentId?: string };
}

@Injectable()
export class EstablishmentModulesGuard implements CanActivate {
  constructor(
    private readonly _reflector: Reflector,
    private readonly _securityRepository: SecurityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this._reflector.getAllAndOverride<EstablishmentModule[]>(ESTABLISHMENT_MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const establishmentId = context.switchToHttp().getRequest<RequestWithEstablishment>().params?.establishmentId;

    if (!establishmentId) {
      return true;
    }

    const enabled = await this._securityRepository.getEnabledModules(establishmentId);

    /*
     * Deliberately no platform-admin bypass, unlike the permissions guard. A module says what the
     * establishment has, not who the caller is: an admin creating an order in an establishment
     * without the orders module would write rows nobody there can ever see.
     */
    if (!required.every((module) => enabled.includes(module))) {
      throw new ForbiddenException(ErrorCodes.MODULE_NOT_ENABLED);
    }

    return true;
  }
}
