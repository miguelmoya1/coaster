import { DbRole } from '../..';
import { SetMetadata } from '@nestjs/common';

export const USER_ROLES_KEY = 'user_roles';
export const UserRoles = (...roles: DbRole[]) => SetMetadata(USER_ROLES_KEY, roles);
