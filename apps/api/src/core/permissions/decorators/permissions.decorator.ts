import { BarPermission } from '@coaster/common';
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: BarPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
