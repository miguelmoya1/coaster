import type { Order } from '@coaster/common';
import {
  AdjustmentTarget,
  AdjustmentType,
  asOrderAdjustmentId,
  asOrderId,
  asOrderItemId,
  asProductId,
  asTableId,
  OrderStatus,
  PaymentMethod,
} from '@coaster/common';
import {
  AddOrderAdjustmentCommand,
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CancelOrderCommand,
  CheckoutOrderCommand,
  CreateOrderCommand,
  DeleteOrderCommand,
  GetOrderByIdQuery,
  GetOrdersByBarIdQuery,
  GetOrdersByDateQuery,
  MergeOrdersCommand,
  MoveOrderTableCommand,
  RemoveOrderAdjustmentCommand,
  RemoveOrderItemCommand,
  UpdateOrderTipCommand,
} from '@coaster/orders';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, failed, toCents, toEuros, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('OrderTools');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const createOrderTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  const productName = (productId: string) =>
    context.products.find((product) => product.id === productId)?.name ?? 'Unknown product';

  const tableName = (tableId?: string) => context.tables.find((table) => table.id === tableId)?.name ?? 'No table';

  const tableNameForOrder = (orderId: string) =>
    tableName(context.openOrders.find((order) => order.id === orderId)?.tableId);

  const summarizeOrder = (order: Order) => ({
    id: order.id,
    table: tableName(order.tableId),
    status: order.status,
    total: toEuros(order.orderTotal ?? order.totalAmount),
    pending: toEuros((order.payableTotal ?? order.totalAmount) - order.amountPaidCash - order.amountPaidCard),
    items: order.items.map((item) => ({
      itemId: item.id,
      product: productName(item.productId),
      quantity: item.quantity,
      served: item.servedQuantity,
      paid: item.paidQuantity,
    })),
  });

  return {
    listOpenOrders: tool({
      description:
        'List the currently open orders with their items, served/paid quantities and totals in euros. Use it to refresh the order list before acting on it.',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listOpenOrders' called`);
        return runner.query<Order[]>(
          'bar:view-orders',
          new GetOrdersByBarIdQuery(context.barId, OrderStatus.OPEN),
          (orders) => orders.map(summarizeOrder),
        );
      },
    }),

    getOrderDetails: tool({
      description:
        'Get the full detail of a single order: items, item UUIDs, served and paid quantities, discounts, tip and totals in euros.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order to inspect.'),
        }),
      ),
      execute: async ({ orderId }: { orderId: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'getOrderDetails' called with orderId="${orderId}"`);
        return runner.query<Order>(
          'bar:view-orders',
          new GetOrderByIdQuery(context.barId, asOrderId(orderId)),
          (order) => ({
            ...summarizeOrder(order),
            tip: toEuros(order.tipAmount),
            paidCash: toEuros(order.amountPaidCash),
            paidCard: toEuros(order.amountPaidCard),
            adjustments: order.adjustments?.map((adjustment) => ({
              adjustmentId: adjustment.id,
              target: adjustment.target,
              type: adjustment.type,
              value: adjustment.type === AdjustmentType.PERCENTAGE ? adjustment.value : toEuros(adjustment.value),
              reason: adjustment.reason,
            })),
          }),
        );
      },
    }),

    getOrdersByDate: tool({
      description:
        'List every order of a given day (closed, cancelled and open) to answer questions about past activity, such as what was sold yesterday.',
      inputSchema: zodSchema(
        z.object({
          date: z.string().describe('The day to look up, formatted as YYYY-MM-DD.'),
        }),
      ),
      execute: async ({ date }: { date: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'getOrdersByDate' called with date="${date}"`);
        if (!ISO_DATE.test(date)) {
          return failed('The date must be formatted as YYYY-MM-DD.');
        }
        return runner.query<Order[]>('bar:view-orders', new GetOrdersByDateQuery(context.barId, date), (orders) => ({
          count: orders.length,
          revenue: toEuros(
            orders
              .filter((order) => order.status === OrderStatus.CLOSED)
              .reduce((total, order) => total + order.totalAmount, 0),
          ),
          orders: orders.map(summarizeOrder),
        }));
      },
    }),

    createOrder: tool({
      description: 'Create a new open order for a specific table in the bar.',
      inputSchema: zodSchema(
        z.object({
          tableId: z
            .string()
            .describe(
              'The UUID of the table where this new order is placed. Look up the user-specified table name (e.g. "Mesa 2") in the list of available tables to find its UUID.',
            ),
          items: z
            .array(
              z.object({
                productId: z
                  .string()
                  .describe(
                    'The UUID of the product. Match the food/drink name requested (e.g. "cerveza", "café", "bocadillo") against the available products list to get its UUID.',
                  ),
                quantity: z
                  .number()
                  .int()
                  .min(1)
                  .describe(
                    'The quantity of the item. Match natural numbers or word numbers, e.g. "tres cañas" -> 3. Defaults to 1 if not specified.',
                  ),
              }),
            )
            .describe('List of exact product UUIDs and their quantities.'),
        }),
      ),
      execute: async ({
        tableId,
        items,
      }: {
        tableId: string;
        items: { productId: string; quantity: number }[];
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'createOrder' called with tableId="${tableId}", items=${JSON.stringify(items)}`);
        const validItems = items.filter((item) => context.products.some((product) => product.id === item.productId));

        if (validItems.length === 0) {
          logger.warn(`[AI Tool] No valid items found to create order.`);
          return failed(`None of the requested products are available in this bar's menu.`);
        }

        return runner.execute(
          'bar:create-order',
          new CreateOrderCommand(context.barId, {
            tableId: tableId ? asTableId(tableId) : undefined,
            items: validItems.map((item) => ({ productId: asProductId(item.productId), quantity: item.quantity })),
          }),
        );
      },
    }),

    addOrderItems: tool({
      description: 'Add more items to an existing open order.',
      inputSchema: zodSchema(
        z.object({
          orderId: z
            .string()
            .describe(
              'The UUID of the existing open order to add items to. Look up the active open orders list to find the order UUID matching the requested table or order details.',
            ),
          items: z
            .array(
              z.object({
                productId: z
                  .string()
                  .describe(
                    'The UUID of the product. Match the food/drink name requested (e.g. "cerveza", "café", "bocadillo") against the available products list to get its UUID.',
                  ),
                quantity: z
                  .number()
                  .int()
                  .min(1)
                  .describe(
                    'The quantity of the item to add. Match natural numbers or word numbers, e.g. "tres cañas" -> 3. Defaults to 1 if not specified.',
                  ),
              }),
            )
            .describe('List of product UUIDs and their quantities.'),
        }),
      ),
      execute: async ({
        orderId,
        items,
      }: {
        orderId: string;
        items: { productId: string; quantity: number }[];
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'addOrderItems' called with orderId="${orderId}", items=${JSON.stringify(items)}`);
        const validItems = items.filter((item) => context.products.some((product) => product.id === item.productId));

        if (validItems.length === 0) {
          logger.warn(`[AI Tool] No valid items found to add to order.`);
          return failed(`None of the requested products are available in this bar's menu.`);
        }

        return runner.execute(
          'bar:update-order',
          new AddOrderItemsCommand(context.barId, asOrderId(orderId), {
            items: validItems.map((item) => ({ productId: asProductId(item.productId), quantity: item.quantity })),
          }),
        );
      },
    }),

    checkoutOrder: tool({
      description: 'Collect payment and close an open order.',
      inputSchema: zodSchema(
        z.object({
          orderId: z
            .string()
            .describe(
              'The UUID of the open order to check out. Look up the active open orders list to find the order UUID matching the table or order details.',
            ),
          paymentMethod: z
            .enum([PaymentMethod.CASH, PaymentMethod.CARD])
            .describe(
              'Payment method: CASH (efectivo, caja) or CARD (tarjeta, datáfono). Defaults to CASH if not specified.',
            ),
        }),
      ),
      execute: async ({
        orderId,
        paymentMethod,
      }: {
        orderId: string;
        paymentMethod: PaymentMethod;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'checkoutOrder' called with orderId="${orderId}", paymentMethod="${paymentMethod}"`);
        return runner.execute(
          'bar:checkout-order',
          new CheckoutOrderCommand(context.barId, asOrderId(orderId), paymentMethod),
        );
      },
    }),

    serveOrPayItems: tool({
      description: 'Update the preparation (served) or payment status of items in an open order.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order to update.'),
          items: z
            .array(
              z.object({
                itemId: z
                  .string()
                  .describe(
                    'The UUID of the order item to update (OrderItemId). Find this item ID inside the items list of the specified order in the active open orders list.',
                  ),
                servedQuantity: z
                  .number()
                  .int()
                  .min(0)
                  .optional()
                  .describe(
                    'The new total quantity of this item that has been prepared/served. Use this when the user says "saca X cañas" or "sirve la mesa".',
                  ),
                paidQuantity: z
                  .number()
                  .int()
                  .min(0)
                  .optional()
                  .describe('The new total quantity of this item that has been paid.'),
                paymentMethod: z
                  .enum([PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.NONE])
                  .optional()
                  .describe('Payment method used if paying.'),
              }),
            )
            .describe('List of order items to update.'),
        }),
      ),
      execute: async ({
        orderId,
        items,
      }: {
        orderId: string;
        items: { itemId: string; servedQuantity?: number; paidQuantity?: number; paymentMethod?: PaymentMethod }[];
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'serveOrPayItems' called with orderId="${orderId}", items=${JSON.stringify(items)}`);
        return runner.execute(
          'bar:update-order',
          new BulkUpdateOrderCommand(context.barId, asOrderId(orderId), {
            items: items.map((item) => ({
              itemId: asOrderItemId(item.itemId),
              servedQuantity: item.servedQuantity,
              paidQuantity: item.paidQuantity,
              paymentMethod: item.paymentMethod,
            })),
          }),
        );
      },
    }),

    moveOrderTable: tool({
      description: 'Move an open order to a different table, e.g. when a group changes seats.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order to move.'),
          tableId: z.string().describe('The UUID of the destination table.'),
        }),
      ),
      execute: async ({ orderId, tableId }: { orderId: string; tableId: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'moveOrderTable' called with orderId="${orderId}", tableId="${tableId}"`);
        return runner.execute(
          'bar:move-order-table',
          new MoveOrderTableCommand(context.barId, asOrderId(orderId), { tableId: asTableId(tableId) }),
        );
      },
    }),

    mergeOrders: tool({
      description: 'Merge two or more open orders into a single one, e.g. when two tables want to pay together.',
      inputSchema: zodSchema(
        z.object({
          orderIds: z.array(z.string()).min(2).describe('The UUIDs of the orders to merge. At least two are required.'),
          targetTableId: z
            .string()
            .optional()
            .describe('Optional UUID of the table the merged order should end up at.'),
        }),
      ),
      execute: async ({
        orderIds,
        targetTableId,
      }: {
        orderIds: string[];
        targetTableId?: string;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'mergeOrders' called with orderIds=${JSON.stringify(orderIds)}`);
        return runner.execute(
          'bar:merge-orders',
          new MergeOrdersCommand(context.barId, {
            orderIds: orderIds.map(asOrderId),
            targetTableId: targetTableId ? asTableId(targetTableId) : undefined,
          }),
        );
      },
    }),

    updateOrderTip: tool({
      description: 'Set the tip of an open order. The tip replaces any previous tip on that order.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order.'),
          tip: z.number().min(0).describe('The tip amount in Euros, e.g. 2.50. Use 0 to remove the tip.'),
        }),
      ),
      execute: async ({ orderId, tip }: { orderId: string; tip: number }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'updateOrderTip' called with orderId="${orderId}", tip=${tip}`);
        return runner.execute(
          'bar:update-order',
          new UpdateOrderTipCommand(context.barId, asOrderId(orderId), { tipAmount: toCents(tip) }),
        );
      },
    }),

    applyOrderDiscount: tool({
      description:
        'Apply a discount to a whole order or to one of its items, either as a percentage or as a fixed amount in Euros.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order to discount.'),
          target: z
            .enum([AdjustmentTarget.ORDER, AdjustmentTarget.ITEM])
            .describe('ORDER discounts the full order, ITEM discounts a single line of the order.'),
          itemId: z.string().optional().describe('The UUID of the order item. Required when target is ITEM.'),
          type: z
            .enum([AdjustmentType.PERCENTAGE, AdjustmentType.FIXED_AMOUNT])
            .describe('PERCENTAGE for "un 10% de descuento", FIXED_AMOUNT for "quítale 2 euros".'),
          value: z
            .number()
            .min(0)
            .describe('The percentage (1-100) when type is PERCENTAGE, or the amount in Euros when FIXED_AMOUNT.'),
          reason: z.string().optional().describe('Short reason for the discount, e.g. "invitación" or "queja".'),
        }),
      ),
      execute: async ({
        orderId,
        target,
        itemId,
        type,
        value,
        reason,
      }: {
        orderId: string;
        target: AdjustmentTarget;
        itemId?: string;
        type: AdjustmentType;
        value: number;
        reason?: string;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'applyOrderDiscount' called with orderId="${orderId}", type="${type}", value=${value}`);

        if (target === AdjustmentTarget.ITEM && !itemId) {
          return failed('An itemId is required to discount a single order item.');
        }

        if (type === AdjustmentType.PERCENTAGE && (value < 1 || value > 100)) {
          return failed('A percentage discount must be between 1 and 100.');
        }

        return runner.execute(
          'bar:update-order',
          new AddOrderAdjustmentCommand(context.barId, asOrderId(orderId), {
            target,
            type,
            value: type === AdjustmentType.PERCENTAGE ? Math.round(value) : toCents(value),
            itemId: itemId ? asOrderItemId(itemId) : undefined,
            reason,
          }),
        );
      },
    }),

    removeOrderDiscount: tool({
      description: 'Remove a discount previously applied to an order. Use getOrderDetails to find the adjustment UUID.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order.'),
          adjustmentId: z.string().describe('The UUID of the adjustment (discount) to remove.'),
        }),
      ),
      execute: async ({ orderId, adjustmentId }: { orderId: string; adjustmentId: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'removeOrderDiscount' called with adjustmentId="${adjustmentId}"`);
        return runner.execute(
          'bar:update-order',
          new RemoveOrderAdjustmentCommand(context.barId, asOrderId(orderId), asOrderAdjustmentId(adjustmentId)),
        );
      },
    }),

    removeOrderItem: tool({
      description:
        'Remove a single item line from an open order, e.g. when a drink was added by mistake. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order.'),
          itemId: z.string().describe('The UUID of the order item to remove.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the removal in a previous turn.'),
        }),
      ),
      execute: async ({
        orderId,
        itemId,
        confirmed,
      }: {
        orderId: string;
        itemId: string;
        confirmed: boolean;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'removeOrderItem' called with itemId="${itemId}", confirmed=${confirmed}`);
        return runner.execute(
          'bar:delete-order-item',
          new RemoveOrderItemCommand(context.barId, asOrderId(orderId), asOrderItemId(itemId)),
          { confirmed, summary: 'remove that item from the order' },
        );
      },
    }),

    cancelOrder: tool({
      description: 'Cancel an open order without charging it. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          orderId: z
            .string()
            .describe('The UUID of the order to cancel. Find the order UUID in the active open orders list.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the cancellation in a previous turn.'),
        }),
      ),
      execute: async ({ orderId, confirmed }: { orderId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'cancelOrder' called with orderId="${orderId}", confirmed=${confirmed}`);
        return runner.execute('bar:cancel-order', new CancelOrderCommand(context.barId, asOrderId(orderId)), {
          confirmed,
          summary: `cancel the order of table "${tableNameForOrder(orderId)}"`,
        });
      },
    }),

    deleteOrder: tool({
      description:
        'Permanently delete an order and all its history. Destructive: requires the user to confirm first. Prefer cancelOrder unless the user really wants it gone.',
      inputSchema: zodSchema(
        z.object({
          orderId: z.string().describe('The UUID of the order to delete.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the deletion in a previous turn.'),
        }),
      ),
      execute: async ({ orderId, confirmed }: { orderId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'deleteOrder' called with orderId="${orderId}", confirmed=${confirmed}`);
        return runner.execute('bar:delete-order', new DeleteOrderCommand(context.barId, asOrderId(orderId)), {
          confirmed,
          summary: `permanently delete the order of table "${tableNameForOrder(orderId)}"`,
        });
      },
    }),
  };
};
