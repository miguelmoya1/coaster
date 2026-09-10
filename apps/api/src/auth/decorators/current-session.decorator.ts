import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface SessionClaims {
  sub: string;
  sid: string;
}

export const CurrentSession = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ session?: SessionClaims }>();

  return request.session ?? null;
});
