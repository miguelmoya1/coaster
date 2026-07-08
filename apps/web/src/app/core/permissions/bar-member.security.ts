import { BarPermission, BarRole } from '@coaster/common';

const STAFF_PERMISSIONS: BarPermission[] = [
  // --- Members ---
  'bar:view-members',

  // --- Tables ---
  'bar:view-tables',
  'bar:open-table',

  // --- Orders ---
  'bar:view-orders',
  'bar:create-order',
  'bar:update-order',
  'bar:delete-order-item',
  'bar:checkout-order',
  'bar:cancel-order',
  'bar:move-order-table',
  'bar:merge-orders',

  // --- Products & Categories ---
  'bar:view-categories',
  'bar:view-products',
  'bar:update-product-stock',

  // --- Shifts & Roster ---
  'bar:view-shifts',
  'bar:view-exchanges',
  'bar:create-exchange',
  'bar:accept-exchange',
  'bar:delete-exchange',
];

export const ROLE_PERMISSIONS: Record<BarRole, BarPermission[]> = {
  OWNER: [], // OWNER permissions are handled explicitly below
  MANAGER: [
    // --- Management Dashboard ---
    'bar:view-dashboard',

    // --- Staff Management ---
    'bar:invite-member',

    // --- Pantry Management ---
    'bar:create-category',
    'bar:update-category',
    'bar:create-product',
    'bar:update-product',

    // --- Roster Management ---
    'bar:create-shift',
    'bar:delete-shift',

    // Inherits all staff permissions
    ...STAFF_PERMISSIONS,
  ],
  STAFF: STAFF_PERMISSIONS,
};

export const hasPermission = (role: BarRole, permission: BarPermission): boolean => {
  if (role === BarRole.OWNER) return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};
