import type { EstablishmentId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { CanActivate, ConflictException, ExecutionContext, Injectable } from '@nestjs/common';
import { FichitSync } from '../services/fichit-sync.service';

interface RequestWithEstablishment {
  params: { establishmentId: EstablishmentId };
}

@Injectable()
export class ClockingMovedGuard implements CanActivate {
  constructor(private readonly sync: FichitSync) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { params } = context.switchToHttp().getRequest<RequestWithEstablishment>();

    if (await this.sync.clocksInFichit(params.establishmentId)) {
      throw new ConflictException(ErrorCodes.CLOCKING_MOVED_TO_FICHIT);
    }

    return true;
  }
}
