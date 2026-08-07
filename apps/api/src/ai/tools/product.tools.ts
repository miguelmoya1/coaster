import type { Product } from '@coaster/common';
import { asCategoryId, asProductId } from '@coaster/common';
import {
  AdjustProductStockCommand,
  CreateProductCommand,
  DeleteProductCommand,
  GetProductsByBarIdQuery,
  UpdateProductCommand,
  UpdateProductStockCommand,
} from '@coaster/products';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, failed, toCents, toEuros, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('ProductTools');

export const createProductTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    listProducts: tool({
      description:
        'List the products of the bar with their UUID, price in euros, current stock and minimum stock alert. Use lowStockOnly to answer questions like "¿qué productos están bajo mínimos?" or "¿de qué me estoy quedando sin stock?".',
      inputSchema: zodSchema(
        z.object({
          lowStockOnly: z
            .boolean()
            .optional()
            .describe('When true, return only products whose current stock is at or below their minimum stock alert.'),
          search: z.string().optional().describe('Optional case-insensitive filter on the product name.'),
        }),
      ),
      execute: async ({ lowStockOnly, search }: { lowStockOnly?: boolean; search?: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listProducts' called with lowStockOnly=${lowStockOnly}, search="${search}"`);
        const needle = search?.trim().toLowerCase();

        return runner.query<Product[]>('bar:view-products', new GetProductsByBarIdQuery(context.barId), (products) =>
          products
            .filter((product) => !needle || product.name.toLowerCase().includes(needle))
            .filter((product) => !lowStockOnly || product.currentStock <= product.minStockAlert)
            .map((product) => ({
              id: product.id,
              name: product.name,
              price: toEuros(product.price),
              currentStock: product.currentStock,
              minStockAlert: product.minStockAlert,
              categoryId: product.categoryId,
            })),
        );
      },
    }),

    createProduct: tool({
      description: 'Create a new product in the bar menu. The category must already exist.',
      inputSchema: zodSchema(
        z.object({
          name: z.string().describe('Name of the new product, e.g. "Tarta de queso".'),
          categoryId: z
            .string()
            .describe('The UUID of the category this product belongs to. Match it in the available categories list.'),
          price: z.number().min(0).describe('Price of the product in Euros, e.g. 2.50.'),
          currentStock: z.number().int().min(0).optional().describe('Initial stock quantity. Defaults to 0.'),
          minStockAlert: z.number().int().min(0).optional().describe('Stock level that should trigger a low alert.'),
        }),
      ),
      execute: async ({
        name,
        categoryId,
        price,
        currentStock,
        minStockAlert,
      }: {
        name: string;
        categoryId: string;
        price: number;
        currentStock?: number;
        minStockAlert?: number;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'createProduct' called with name="${name}", categoryId="${categoryId}"`);

        if (!context.categories.some((category) => category.id === categoryId)) {
          return failed('That category does not exist in this bar. Create it first or pick an existing one.');
        }

        return runner.execute(
          'bar:create-product',
          new CreateProductCommand(context.barId, {
            name,
            categoryId: asCategoryId(categoryId),
            price: toCents(price),
            currentStock,
            minStockAlert,
          }),
        );
      },
    }),

    updateProduct: tool({
      description:
        'Update details of an existing product in the bar, such as name, categoryId, price (in Euros, e.g. 2.50), or minStockAlert.',
      inputSchema: zodSchema(
        z.object({
          productId: z.string().describe('The UUID of the product to update.'),
          name: z.string().optional().describe('New name of the product.'),
          categoryId: z.string().optional().describe('New Category UUID of the product.'),
          price: z.number().optional().describe('New price of the product in Euros (e.g. 2.50).'),
          minStockAlert: z.number().int().min(0).optional().describe('Minimum stock level to trigger an alert.'),
        }),
      ),
      execute: async ({
        productId,
        name,
        categoryId,
        price,
        minStockAlert,
      }: {
        productId: string;
        name?: string;
        categoryId?: string;
        price?: number;
        minStockAlert?: number;
      }): Promise<ToolResult> => {
        logger.debug(
          `[AI Tool] 'updateProduct' called with productId="${productId}", name="${name}", categoryId="${categoryId}", price=${price}, minStockAlert=${minStockAlert}`,
        );
        return runner.execute(
          'bar:update-product',
          new UpdateProductCommand(context.barId, asProductId(productId), {
            name,
            categoryId: categoryId ? asCategoryId(categoryId) : undefined,
            price: price !== undefined ? toCents(price) : undefined,
            minStockAlert,
          }),
        );
      },
    }),

    updateProductStock: tool({
      description:
        'Set the current stock quantity of a product to an exact value. Use it for "quedan 12 cervezas" or after a stock count.',
      inputSchema: zodSchema(
        z.object({
          productId: z.string().describe('The UUID of the product to update stock for.'),
          currentStock: z.number().int().min(0).describe('The new current stock quantity.'),
        }),
      ),
      execute: async ({
        productId,
        currentStock,
      }: {
        productId: string;
        currentStock: number;
      }): Promise<ToolResult> => {
        logger.debug(
          `[AI Tool] 'updateProductStock' called with productId="${productId}", currentStock=${currentStock}`,
        );
        return runner.execute(
          'bar:update-product-stock',
          new UpdateProductStockCommand(context.barId, asProductId(productId), { currentStock }),
        );
      },
    }),

    adjustProductStock: tool({
      description:
        'Add or subtract stock relative to the current amount. Use it for "ha entrado un palé de 24 cervezas" (delta 24) or "se han roto 3 vasos" (delta -3).',
      inputSchema: zodSchema(
        z.object({
          productId: z.string().describe('The UUID of the product to adjust.'),
          delta: z
            .number()
            .int()
            .describe('Positive to add stock (a delivery arrived), negative to subtract it (breakage, waste).'),
        }),
      ),
      execute: async ({ productId, delta }: { productId: string; delta: number }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'adjustProductStock' called with productId="${productId}", delta=${delta}`);

        if (delta === 0) {
          return failed('The stock delta cannot be zero.');
        }

        return runner.execute(
          'bar:update-product-stock',
          new AdjustProductStockCommand(context.barId, asProductId(productId), delta),
        );
      },
    }),

    deleteProduct: tool({
      description: 'Permanently delete a product from the bar menu. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          productId: z.string().describe('The UUID of the product to delete.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the deletion in a previous turn.'),
        }),
      ),
      execute: async ({ productId, confirmed }: { productId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'deleteProduct' called with productId="${productId}", confirmed=${confirmed}`);
        const product = context.products.find((candidate) => candidate.id === productId);

        return runner.execute('bar:delete-product', new DeleteProductCommand(context.barId, asProductId(productId)), {
          confirmed,
          summary: `permanently delete the product "${product?.name ?? productId}" from the menu`,
        });
      },
    }),
  };
};
