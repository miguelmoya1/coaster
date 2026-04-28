import { BarRole } from '@coaster/common';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: BarRole[]) => SetMetadata(ROLES_KEY, roles);
