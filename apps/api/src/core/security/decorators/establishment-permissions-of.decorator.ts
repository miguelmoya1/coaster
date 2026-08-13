import { EstablishmentPermission } from '@coaster/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const EstablishmentPermissionsOf = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ establishmentPermissions?: EstablishmentPermission[] }>();

  return request.establishmentPermissions ?? [];
});
