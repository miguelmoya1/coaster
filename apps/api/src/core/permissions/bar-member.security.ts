import type { BarRole, BarPermission } from '@coaster/common';

export const ROLE_PERMISSIONS: Record<BarRole, BarPermission[]> = {
  OWNER: [],
  STAFF: [
    'bar:view-members',
    'bar:open-table',
    'bar:view-tables',
    'bar:create-order',
    'bar:view-orders',
    'bar:update-order',
    'bar:delete-order-item',
    'bar:checkout-order',
    'bar:cancel-order',
    'bar:move-order-table',
    'bar:merge-orders',
    'bar:view-products',
    'bar:update-product-stock',
    'bar:view-categories',
    'bar:view-shifts',
    'bar:view-exchanges',
    'bar:create-exchange',
    'bar:accept-exchange',
    'bar:delete-exchange',
  ],
};

export const hasPermission = (role: BarRole, permission: BarPermission): boolean => {
  if (role === 'OWNER') return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};

export const getRolePermissions = (role: BarRole): BarPermission[] => {
  if (role === 'OWNER') {
    return [...ROLE_PERMISSIONS.STAFF];
  }
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? [...permissions] : [];
};
