import { BarPermission } from '@coaster/common';
import { SetMetadata } from '@nestjs/common';

export const BAR_PERMISSIONS_KEY = 'bar_permissions';
export const BarPermissions = (...permissions: BarPermission[]) => SetMetadata(BAR_PERMISSIONS_KEY, permissions);
