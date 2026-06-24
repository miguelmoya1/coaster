import type { BarId, BarPermission, Category, Product } from '@coaster/common';

export interface AiToolsData {
  barId: BarId;
  products: Product[];
  categories: Category[];
}

export interface PreparedAction {
  permission: BarPermission;
  command: any;
}
