import { EstablishmentPermission } from '../../constants/establishment-permissions.type';
import { EstablishmentRole } from '../../constants/establishment-role.type';

const STAFF_PERMISSIONS: EstablishmentPermission[] = [
  'establishment:view-dashboard',

  'establishment:view-members',

  'establishment:view-tables',
  'establishment:open-table',

  'establishment:view-orders',
  'establishment:create-order',
  'establishment:update-order',
  'establishment:delete-order-item',
  'establishment:checkout-order',
  'establishment:cancel-order',
  'establishment:move-order-table',
  'establishment:merge-orders',

  'establishment:view-categories',
  'establishment:view-products',
  'establishment:update-product-stock',

  'establishment:view-shifts',
  'establishment:clock-in',
  'establishment:amend-own-time-entry',
  'establishment:view-exchanges',
  'establishment:create-exchange',
  'establishment:accept-exchange',
  'establishment:delete-exchange',

  'establishment:view-printer',
];

const MANAGER_PERMISSIONS: EstablishmentPermission[] = [
  'establishment:view-financials',

  'establishment:invite-member',

  'establishment:create-category',
  'establishment:update-category',
  'establishment:create-product',
  'establishment:update-product',

  'establishment:create-shift',
  'establishment:delete-shift',

  'establishment:view-time-entries',
  'establishment:manage-time-entries',

  'establishment:manage-printer',
  'establishment:manage-menu',
];

const OWNER_PERMISSIONS: EstablishmentPermission[] = [
  'establishment:remove-member',
  'establishment:update-member-role',

  'establishment:create-table',
  'establishment:update-table',
  'establishment:delete-table',

  'establishment:delete-order',

  'establishment:delete-category',
  'establishment:delete-product',
  'establishment:import-catalogue',

  'establishment:view-financials-history',
  'establishment:view-labor-cost',

  'establishment:manage-billing',
  'establishment:manage-settings',
];

export const ROLE_PERMISSIONS: Record<EstablishmentRole, EstablishmentPermission[]> = {
  OWNER: [...OWNER_PERMISSIONS, ...MANAGER_PERMISSIONS, ...STAFF_PERMISSIONS],
  MANAGER: [...MANAGER_PERMISSIONS, ...STAFF_PERMISSIONS],
  STAFF: [...STAFF_PERMISSIONS],
};

export const hasPermission = (role: EstablishmentRole, permission: EstablishmentPermission): boolean =>
  ROLE_PERMISSIONS[role]?.includes(permission) ?? false;

export const getRolePermissions = (role: EstablishmentRole): EstablishmentPermission[] => [
  ...(ROLE_PERMISSIONS[role] ?? []),
];
