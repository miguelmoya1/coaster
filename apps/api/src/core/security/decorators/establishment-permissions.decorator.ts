import { EstablishmentPermission } from '@coaster/common';
import { SetMetadata } from '@nestjs/common';

export const ESTABLISHMENT_PERMISSIONS_KEY = 'establishment_permissions';
export const EstablishmentPermissions = (...permissions: EstablishmentPermission[]) =>
  SetMetadata(ESTABLISHMENT_PERMISSIONS_KEY, permissions);
