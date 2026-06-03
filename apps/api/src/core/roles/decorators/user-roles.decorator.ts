import { Role } from '../..';
import { SetMetadata } from '@nestjs/common';

export const USER_ROLES_KEY = 'user_roles';
export const UserRoles = (...roles: Role[]) => SetMetadata(USER_ROLES_KEY, roles);
