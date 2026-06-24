import { Logger } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import {
  AddOrderItemsCommand,
  BulkUpdateOrderCommand,
  CancelOrderCommand,
  CheckoutOrderCommand,
  CreateOrderCommand,
} from '../../orders/commands';
import { asOrderId, asOrderItemId, asProductId, asTableId } from '../../core';
import type { AiToolsData, PreparedAction } from './context';

const logger = new Logger('OrderTools');

export const createOrderTools = (data: AiToolsData) => ({
  createOrder: tool({
    description: 'Create a new open order for a specific table in the bar.',
    inputSchema: z.object({
      tableId: z.string().describe('The UUID of the table where this new order is placed. Look up the user-specified table name (e.g. "Mesa 2") in the list of available tables to find its UUID.'),
      items: z
        .array(
          z.object({
            productId: z.string().describe('The UUID of the product. Match the food/drink name requested (e.g. "cerveza", "café", "bocadillo") against the available products list to get its UUID.'),
            quantity: z.number().int().min(1).describe('The quantity of the item. Match natural numbers or word numbers, e.g. "tres cañas" -> 3. Defaults to 1 if not specified.'),
          }),
        )
        .describe('List of exact product UUIDs and their quantities.'),
    }),
    execute: async ({ tableId, items }): Promise<PreparedAction | string> => {
      logger.debug(
        `[AI Tool] 'createOrder' called with tableId="${tableId}", items=${JSON.stringify(items)}`,
      );
      const validItems = items.filter((item) => data.products.some((p) => p.id === item.productId));
      logger.debug(`[AI Tool] Filtered valid items: ${JSON.stringify(validItems)}`);
      if (validItems.length === 0) {
        logger.warn(`[AI Tool] No valid items found to create order.`);
        return {
          isError: true,
          errorKey: 'ai_voice.errors.products_not_found',
          text: `Error: None of the requested products are available in this bar's menu.`,
        } as any;
      }
      return {
        permission: 'bar:create-order',
        command: new CreateOrderCommand(data.barId, {
          tableId: tableId ? asTableId(tableId) : undefined,
          items: validItems.map((i) => ({ productId: asProductId(i.productId), quantity: i.quantity })),
        }),
      };
    },
  }),

  addOrderItems: tool({
    description: 'Add more items to an existing open order.',
    inputSchema: z.object({
      orderId: z.string().describe('The UUID of the existing open order to add items to. Look up the active open orders list to find the order UUID matching the requested table or order details.'),
      items: z
        .array(
          z.object({
            productId: z.string().describe('The UUID of the product. Match the food/drink name requested (e.g. "cerveza", "café", "bocadillo") against the available products list to get its UUID.'),
            quantity: z.number().int().min(1).describe('The quantity of the item to add. Match natural numbers or word numbers, e.g. "tres cañas" -> 3. Defaults to 1 if not specified.'),
          }),
        )
        .describe('List of product UUIDs and their quantities.'),
    }),
    execute: async ({ orderId, items }): Promise<PreparedAction | string> => {
      logger.debug(
        `[AI Tool] 'addOrderItems' called with orderId="${orderId}", items=${JSON.stringify(items)}`,
      );
      const validItems = items.filter((item) => data.products.some((p) => p.id === item.productId));
      logger.debug(`[AI Tool] Filtered valid items: ${JSON.stringify(validItems)}`);
      if (validItems.length === 0) {
        logger.warn(`[AI Tool] No valid items found to add to order.`);
        return {
          isError: true,
          errorKey: 'ai_voice.errors.products_not_found',
          text: `Error: None of the requested products are available in this bar's menu.`,
        } as any;
      }
      return {
        permission: 'bar:update-order',
        command: new AddOrderItemsCommand(data.barId, asOrderId(orderId), {
          items: validItems.map((i) => ({ productId: asProductId(i.productId), quantity: i.quantity })),
        }),
      };
    },
  }),

  checkoutOrder: tool({
    description: 'Collect payment and close an open order.',
    inputSchema: z.object({
      orderId: z.string().describe('The UUID of the open order to check out. Look up the active open orders list to find the order UUID matching the table or order details.'),
      paymentMethod: z.enum(['CASH', 'CARD']).describe('Payment method: CASH (efectivo, caja) or CARD (tarjeta, datáfono). Defaults to CASH if not specified.'),
    }),
    execute: async ({ orderId, paymentMethod }): Promise<PreparedAction> => {
      logger.debug(
        `[AI Tool] 'checkoutOrder' called with orderId="${orderId}", paymentMethod="${paymentMethod}"`,
      );
      return {
        permission: 'bar:checkout-order',
        command: new CheckoutOrderCommand(data.barId, asOrderId(orderId), paymentMethod),
      };
    },
  }),

  serveOrPayItems: tool({
    description: 'Update the preparation (served) or payment status of items in an open order.',
    inputSchema: z.object({
      orderId: z.string().describe('The UUID of the order to update.'),
      items: z
        .array(
          z.object({
            itemId: z.string().describe('The UUID of the order item to update (OrderItemId). Find this item ID inside the items list of the specified order in the active open orders list.'),
            servedQuantity: z
              .number()
              .int()
              .min(0)
              .optional()
              .describe('The new total quantity of this item that has been prepared/served. Use this when the user says "saca X cañas" or "sirve la mesa".'),
            paidQuantity: z.number().int().min(0).optional().describe('The new total quantity of this item that has been paid.'),
            paymentMethod: z
              .enum(['CASH', 'CARD', 'NONE'])
              .optional()
              .describe('Payment method used if paying.'),
          }),
        )
        .describe('List of order items to update.'),
    }),
    execute: async ({ orderId, items }): Promise<PreparedAction> => {
      logger.debug(
        `[AI Tool] 'serveOrPayItems' called with orderId="${orderId}", items=${JSON.stringify(items)}`,
      );
      return {
        permission: 'bar:update-order',
        command: new BulkUpdateOrderCommand(data.barId, asOrderId(orderId), {
          items: items.map((i) => ({
            itemId: asOrderItemId(i.itemId),
            servedQuantity: i.servedQuantity,
            paidQuantity: i.paidQuantity,
            paymentMethod: i.paymentMethod,
          })),
        }),
      };
    },
  }),

  cancelOrder: tool({
    description: 'Cancel an open order.',
    inputSchema: z.object({
      orderId: z.string().describe('The UUID of the order to cancel. Find the order UUID in the active open orders list.'),
    }),
    execute: async ({ orderId }): Promise<PreparedAction> => {
      logger.debug(`[AI Tool] 'cancelOrder' called with orderId="${orderId}"`);
      return {
        permission: 'bar:cancel-order',
        command: new CancelOrderCommand(data.barId, asOrderId(orderId)),
      };
    },
  }),
});
