import { Logger } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import { UpdateProductStockCommand, UpdateProductCommand } from '../../products/commands';
import { asProductId, asCategoryId } from '../../core';
import type { AiToolsContext } from './context';

const logger = new Logger('ProductTools');

export const createProductTools = (ctx: AiToolsContext) => ({
  updateProductStock: tool({
    description: 'Update the current stock quantity of a product in the bar.',
    inputSchema: z.object({
      productId: z.string().describe('The UUID of the product to update stock for.'),
      currentStock: z.number().int().min(0).describe('The new current stock quantity.'),
    }),
    execute: async ({ productId, currentStock }) => {
      logger.debug(
        `[AI Tool] 'updateProductStock' called with productId="${productId}", currentStock=${currentStock}`,
      );
      return ctx.runAction('bar:update-product-stock', () =>
        ctx.commandBus.execute<UpdateProductStockCommand, void>(
          new UpdateProductStockCommand(ctx.barId, asProductId(productId), { currentStock }),
        ),
      );
    },
  }),

  updateProduct: tool({
    description: 'Update details of an existing product in the bar, such as name, categoryId, price (in Euros, e.g. 2.50), or minStockAlert.',
    inputSchema: z.object({
      productId: z.string().describe('The UUID of the product to update.'),
      name: z.string().optional().describe('New name of the product.'),
      categoryId: z.string().optional().describe('New Category UUID of the product.'),
      price: z.number().optional().describe('New price of the product in Euros (e.g. 2.50).'),
      minStockAlert: z.number().int().min(0).optional().describe('Minimum stock level to trigger an alert.'),
    }),
    execute: async ({ productId, name, categoryId, price, minStockAlert }) => {
      logger.debug(
        `[AI Tool] 'updateProduct' called with productId="${productId}", name="${name}", categoryId="${categoryId}", price=${price}, minStockAlert=${minStockAlert}`,
      );
      return ctx.runAction('bar:update-product', () =>
        ctx.commandBus.execute<UpdateProductCommand, void>(
          new UpdateProductCommand(ctx.barId, asProductId(productId), {
            name,
            categoryId: categoryId ? asCategoryId(categoryId) : undefined,
            price: price !== undefined ? Math.round(price * 100) : undefined,
            minStockAlert,
          }),
        ),
      );
    },
  }),
});
