export enum BarPermission {
  // Member management
  INVITE_MEMBER = 'bar:invite-member',
  REMOVE_MEMBER = 'bar:remove-member',
  VIEW_MEMBERS = 'bar:view-members',

  // Table management
  OPEN_TABLE = 'bar:open-table',
  VIEW_TABLES = 'bar:view-tables',
  CREATE_TABLE = 'bar:create-table',
  UPDATE_TABLE = 'bar:update-table',
  DELETE_TABLE = 'bar:delete-table',

  // Order management
  CREATE_ORDER = 'bar:create-order',
  VIEW_ORDERS = 'bar:view-orders',
  UPDATE_ORDER = 'bar:update-order',
  DELETE_ORDER = 'bar:delete-order',
  DELETE_ORDER_ITEM = 'bar:delete-order-item',
  CHECKOUT_ORDER = 'bar:checkout-order',
  CANCEL_ORDER = 'bar:cancel-order',
  MOVE_ORDER_TABLE = 'bar:move-order-table',
  MERGE_ORDERS = 'bar:merge-orders',

  // Product management
  VIEW_PRODUCTS = 'bar:view-products',
  CREATE_PRODUCT = 'bar:create-product',
  UPDATE_PRODUCT = 'bar:update-product',
  UPDATE_PRODUCT_STOCK = 'bar:update-product-stock',
  DELETE_PRODUCT = 'bar:delete-product',

  // Category management
  VIEW_CATEGORIES = 'bar:view-categories',
  CREATE_CATEGORY = 'bar:create-category',
  UPDATE_CATEGORY = 'bar:update-category',
  DELETE_CATEGORY = 'bar:delete-category',

  // Shift management
  VIEW_SHIFTS = 'bar:view-shifts',
  CREATE_SHIFT = 'bar:create-shift',

  // Shift Exchange management
  VIEW_EXCHANGES = 'bar:view-exchanges',
  CREATE_EXCHANGE = 'bar:create-exchange',
  ACCEPT_EXCHANGE = 'bar:accept-exchange',

  // Template management
  IMPORT_TEMPLATES = 'bar:import-templates',
}

export type BarPermissionType = `${BarPermission}`;
