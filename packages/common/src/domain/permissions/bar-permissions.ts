import { BarPermission } from '../../constants/bar-permissions.type';
import { BarRole } from '../../constants/bar-role.type';

const STAFF_PERMISSIONS: BarPermission[] = [
  'bar:view-members',

  'bar:view-tables',
  'bar:open-table',

  'bar:view-orders',
  'bar:create-order',
  'bar:update-order',
  'bar:delete-order-item',
  'bar:checkout-order',
  'bar:cancel-order',
  'bar:move-order-table',
  'bar:merge-orders',

  'bar:view-categories',
  'bar:view-products',
  'bar:update-product-stock',

  'bar:view-shifts',
  'bar:view-exchanges',
  'bar:create-exchange',
  'bar:accept-exchange',
  'bar:delete-exchange',

  'bar:view-printer',
];

export const ROLE_PERMISSIONS: Record<BarRole, BarPermission[]> = {
  OWNER: [],
  MANAGER: [
    'bar:view-dashboard',

    'bar:invite-member',

    'bar:create-category',
    'bar:update-category',
    'bar:create-product',
    'bar:update-product',

    'bar:create-shift',
    'bar:delete-shift',

    'bar:manage-printer',

    ...STAFF_PERMISSIONS,
  ],
  STAFF: STAFF_PERMISSIONS,
};

export const hasPermission = (role: BarRole, permission: BarPermission): boolean => {
  if (role === BarRole.OWNER) return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};

export const getRolePermissions = (role: BarRole): BarPermission[] => {
  if (role === BarRole.OWNER) {
    return [
      'bar:view-dashboard',

      'bar:invite-member',
      'bar:remove-member',

      'bar:create-table',
      'bar:update-table',
      'bar:delete-table',

      'bar:delete-order',

      'bar:create-category',
      'bar:update-category',
      'bar:delete-category',
      'bar:create-product',
      'bar:update-product',
      'bar:delete-product',
      'bar:import-templates',

      'bar:create-shift',
      'bar:delete-shift',

      'bar:manage-printer',

      'bar:manage-billing',

      ...STAFF_PERMISSIONS,
    ];
  }
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? [...permissions] : [];
};
