import { ErrorCodes } from '@coaster/common';
import { AccessTokenService, UsersMapper } from '@coaster/core';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

interface RequestWithUser {
  headers?: Record<string, string | undefined>;
  user?: unknown;
  session?: unknown;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly _tokens: AccessTokenService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const caller = await this._tokens.resolve(request.headers?.authorization);

    if (!caller?.user?.active) {
      throw new UnauthorizedException(ErrorCodes.INVALID_CREDENTIALS);
    }

    request.user = UsersMapper.toDomain(caller.user);
    request.session = caller.claims;

    return true;
  }
}
