import { AccessTokenService, UsersMapper } from '@coaster/core';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

interface RequestWithUser {
  headers?: Record<string, string | undefined>;
  user?: unknown;
}

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly _tokens: AccessTokenService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const caller = await this._tokens.resolve(request.headers?.authorization);

    request.user = caller?.user?.active ? UsersMapper.toDomain(caller.user) : null;

    return true;
  }
}
