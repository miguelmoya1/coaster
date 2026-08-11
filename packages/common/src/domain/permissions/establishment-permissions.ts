import { EstablishmentPermission } from '../../constants/establishment-permissions.type';
import { EstablishmentRole } from '../../constants/establishment-role.type';

const STAFF_PERMISSIONS: EstablishmentPermission[] = [
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

const OWNER_ONLY_PERMISSIONS: EstablishmentPermission[] = [
  'establishment:remove-member',
  'establishment:update-member-role',

  'establishment:create-table',
  'establishment:update-table',
  'establishment:delete-table',

  'establishment:delete-order',

  'establishment:delete-category',
  'establishment:delete-product',
  'establishment:import-catalogue',

  'establishment:manage-billing',
  'establishment:manage-settings',
];

export const ROLE_PERMISSIONS: Record<EstablishmentRole, EstablishmentPermission[]> = {
  OWNER: [],
  MANAGER: [
    'establishment:view-dashboard',

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

    ...STAFF_PERMISSIONS,
  ],
  STAFF: STAFF_PERMISSIONS,
};

export const hasPermission = (role: EstablishmentRole, permission: EstablishmentPermission): boolean => {
  if (role === EstablishmentRole.OWNER) return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};

export const getRolePermissions = (role: EstablishmentRole): EstablishmentPermission[] => {
  if (role === EstablishmentRole.OWNER) {
    return [...ROLE_PERMISSIONS[EstablishmentRole.MANAGER], ...OWNER_ONLY_PERMISSIONS];
  }

  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? [...permissions] : [];
};
