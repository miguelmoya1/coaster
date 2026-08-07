import {
  CreateCategoryCommand,
  DeleteCategoryCommand,
  GetCategoriesQuery,
  UpdateCategoryCommand,
} from '@coaster/categories';
import type { Category } from '@coaster/common';
import { asCategoryId } from '@coaster/common';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, failed, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('CategoryTools');

export const createCategoryTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    listCategories: tool({
      description: 'List the menu categories of the bar with their UUID and icon.',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listCategories' called`);
        return runner.query<Category[]>('bar:view-categories', new GetCategoriesQuery(context.barId), (categories) =>
          categories.map((category) => ({ id: category.id, name: category.name, icon: category.icon })),
        );
      },
    }),

    createCategory: tool({
      description: 'Create a new menu category in the bar, e.g. "Postres" or "Vinos".',
      inputSchema: zodSchema(
        z.object({
          name: z.string().describe('Name of the new category.'),
          icon: z
            .string()
            .optional()
            .describe('Optional Material Symbols icon name, e.g. "local_bar", "restaurant", "cake".'),
        }),
      ),
      execute: async ({ name, icon }: { name: string; icon?: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'createCategory' called with name="${name}", icon="${icon}"`);
        return runner.execute('bar:create-category', new CreateCategoryCommand(context.barId, { name, icon }));
      },
    }),

    updateCategory: tool({
      description: 'Update details of an existing category in the bar, such as its name or icon.',
      inputSchema: zodSchema(
        z.object({
          categoryId: z.string().describe('The UUID of the category to update.'),
          name: z.string().optional().describe('New name of the category.'),
          icon: z.string().optional().describe('New icon name of the category.'),
        }),
      ),
      execute: async ({
        categoryId,
        name,
        icon,
      }: {
        categoryId: string;
        name?: string;
        icon?: string;
      }): Promise<ToolResult> => {
        logger.debug(
          `[AI Tool] 'updateCategory' called with categoryId="${categoryId}", name="${name}", icon="${icon}"`,
        );
        const existingCategory = context.categories.find((category) => category.id === categoryId);

        if (!existingCategory) {
          return failed('Category not found in this bar.');
        }

        return runner.execute(
          'bar:update-category',
          new UpdateCategoryCommand(context.barId, asCategoryId(categoryId), {
            name: name ?? existingCategory.name,
            icon,
          }),
        );
      },
    }),

    deleteCategory: tool({
      description:
        'Permanently delete a menu category. Destructive: requires the user to confirm first, and it affects every product inside it.',
      inputSchema: zodSchema(
        z.object({
          categoryId: z.string().describe('The UUID of the category to delete.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the deletion in a previous turn.'),
        }),
      ),
      execute: async ({ categoryId, confirmed }: { categoryId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'deleteCategory' called with categoryId="${categoryId}", confirmed=${confirmed}`);
        const category = context.categories.find((candidate) => candidate.id === categoryId);
        const productCount = context.products.filter((product) => product.categoryId === categoryId).length;

        return runner.execute(
          'bar:delete-category',
          new DeleteCategoryCommand(context.barId, asCategoryId(categoryId)),
          {
            confirmed,
            summary: `permanently delete the category "${category?.name ?? categoryId}", which currently holds ${productCount} product(s)`,
          },
        );
      },
    }),
  };
};
