import { Timestamp } from '@angular/fire/firestore';

export type OrderStatus = 'pending' | 'ready' | 'served';
export type ProductType = 'bar' | 'kitchen';
export type TableStatus = 'free' | 'occupied' | 'closing';

export interface BarConfig {
  id: string;
  info: {
    name: string;
    wifiPass?: string;
    ownerUid: string;
  };
  menu: {
    categories: MenuCategory[];
  };
  staffList: {
    uid: string;
    name: string;
  }[];
}

export interface MenuCategory {
  id: string;
  name: string;
  icon?: string;
  products: Product[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  type: ProductType;
}

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  currentSessionId?: string;
  openedAt?: Timestamp;
  staffId?: string;
}

export interface LiveOrderItem {
  id: string;
  barId: string;
  tableId: string;
  tableName: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  type: ProductType;
  status: OrderStatus;
  staffId: string;
  staffName: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

export interface HistoryLog {
  id: string;
  barId: string;
  tableId: string;
  tableName: string;
  openedAt: Timestamp;
  closedAt: Timestamp;
  closedByStaffId: string;
  items: LiveOrderItem[];
  totalCalculated: number;
  expireAt: Timestamp;
}

export interface StaffClaims {
  barId: string;
  role: 'owner' | 'staff';
}
