import { BarPermission, BarRole } from '@coaster/common';

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

    ...STAFF_PERMISSIONS,
  ],
  STAFF: STAFF_PERMISSIONS,
};

export const hasPermission = (role: BarRole, permission: BarPermission): boolean => {
  if (role === BarRole.OWNER) return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};
