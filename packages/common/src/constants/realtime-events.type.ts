import { Category, CategoryId } from '../interfaces/category.interface';
import { EstablishmentId } from '../interfaces/establishment.interface';
import { EstablishmentMemberId } from '../interfaces/establishment-member.interface';
import { Order, OrderAdjustment, OrderId } from '../interfaces/order.interface';
import { Product, ProductId } from '../interfaces/product.interface';
import { Shift, ShiftId } from '../interfaces/shift.interface';
import { Table, TableId } from '../interfaces/table.interface';
import { UserId } from '../interfaces/user.interface';
import { EstablishmentRole } from './establishment-role.type';
import { TableStatus } from './table-status.type';

export type RealtimeEventPayloads = {
  productCreated: Product;
  productUpdated: Product;
  productStockChanged: Product;
  productDeleted: { id: ProductId };
  categoryCreated: Category;
  categoryUpdated: Category;
  categoryDeleted: { id: CategoryId };
  memberInvited: { id: EstablishmentMemberId };
  memberRemoved: { id: EstablishmentMemberId };
  memberRoleChanged: { id: EstablishmentMemberId; userId: UserId; role: EstablishmentRole };
  tableStatusChanged: { id: TableId; status: TableStatus };
  tableCreated: Table;
  tableUpdated: Table;
  tableDeleted: { id: TableId };
  orderCreated: Order;
  orderUpdated: Order;
  orderItemAdded: Order;
  orderClosed: Order;
  orderCancelled: Order | { id: OrderId };
  orderDeleted: { id: OrderId };
  orderTipUpdated: { orderId: OrderId; tipAmount: number };
  orderAdjustmentsUpdated: { orderId: OrderId; adjustments: OrderAdjustment[] };
  shiftCreated: Shift;
  shiftDeleted: { id: ShiftId };
  subscriptionUpdated: { establishmentId: EstablishmentId };
};

export type RealtimeEvents = keyof RealtimeEventPayloads;

export const RealtimeEvents = {
  productCreated: 'productCreated',
  productUpdated: 'productUpdated',
  productStockChanged: 'productStockChanged',
  productDeleted: 'productDeleted',
  categoryCreated: 'categoryCreated',
  categoryUpdated: 'categoryUpdated',
  categoryDeleted: 'categoryDeleted',
  memberInvited: 'memberInvited',
  memberRemoved: 'memberRemoved',
  memberRoleChanged: 'memberRoleChanged',
  tableStatusChanged: 'tableStatusChanged',
  tableCreated: 'tableCreated',
  tableUpdated: 'tableUpdated',
  tableDeleted: 'tableDeleted',
  orderCreated: 'orderCreated',
  orderUpdated: 'orderUpdated',
  orderItemAdded: 'orderItemAdded',
  orderClosed: 'orderClosed',
  orderCancelled: 'orderCancelled',
  orderDeleted: 'orderDeleted',
  orderTipUpdated: 'orderTipUpdated',
  orderAdjustmentsUpdated: 'orderAdjustmentsUpdated',
  shiftCreated: 'shiftCreated',
  shiftDeleted: 'shiftDeleted',
  subscriptionUpdated: 'subscriptionUpdated',
} as const satisfies { [K in RealtimeEvents]: K };

export const REALTIME_EVENT_NAMES = Object.keys(RealtimeEvents) as RealtimeEvents[];
