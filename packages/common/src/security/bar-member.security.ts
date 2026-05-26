import { BarPermission } from '../constants/bar-permissions.enum';
import { BarRole } from '../constants/bar-role.enum';

export const ROLE_PERMISSIONS: Record<BarRole, BarPermission[]> = {
  [BarRole.OWNER]: [], // if is owner, always have all permissions
  [BarRole.STAFF]: [
    BarPermission.VIEW_MEMBERS,

    BarPermission.OPEN_TABLE,
    BarPermission.VIEW_TABLES,

    BarPermission.CREATE_ORDER,
    BarPermission.VIEW_ORDERS,
    BarPermission.UPDATE_ORDER,
    BarPermission.DELETE_ORDER_ITEM,
    BarPermission.CHECKOUT_ORDER,
    BarPermission.CANCEL_ORDER,
    BarPermission.MOVE_ORDER_TABLE,
    BarPermission.MERGE_ORDERS,

    BarPermission.VIEW_PRODUCTS,
    BarPermission.UPDATE_PRODUCT_STOCK,

    BarPermission.VIEW_CATEGORIES,
    BarPermission.VIEW_SHIFTS,

    BarPermission.VIEW_EXCHANGES,
    BarPermission.CREATE_EXCHANGE,
    BarPermission.ACCEPT_EXCHANGE,
  ],
};

export const hasPermission = (role: BarRole, permission: BarPermission): boolean => {
  if (role === BarRole.OWNER) {
    return true;
  }

  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
};
export const getRolePermissions = (role: BarRole): BarPermission[] => {
  const permissions = ROLE_PERMISSIONS[role];

  return permissions ? [...permissions] : [];
};
