import { Logger } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import { UpdateCategoryCommand } from '../../categories/commands';
import { asCategoryId } from '../../core';
import type { AiToolsData, PreparedAction } from './context';

const logger = new Logger('CategoryTools');

export const createCategoryTools = (data: AiToolsData) => ({
  updateCategory: tool({
    description: 'Update details of an existing category in the bar, such as its name or icon.',
    inputSchema: z.object({
      categoryId: z.string().describe('The UUID of the category to update.'),
      name: z.string().optional().describe('New name of the category.'),
      icon: z.string().optional().describe('New icon name of the category.'),
    }),
    execute: async ({ categoryId, name, icon }): Promise<PreparedAction | string> => {
      logger.debug(
        `[AI Tool] 'updateCategory' called with categoryId="${categoryId}", name="${name}", icon="${icon}"`,
      );
      const existingCategory = data.categories.find((c) => c.id === categoryId);
      if (!existingCategory) {
        return {
          isError: true,
          errorKey: 'CATEGORY_NOT_FOUND',
          text: `Error: Category not found.`,
        } as any;
      }
      const nameToUse = name ?? existingCategory.name;
      return {
        permission: 'bar:update-category',
        command: new UpdateCategoryCommand(data.barId, asCategoryId(categoryId), {
          name: nameToUse,
          icon,
        }),
      };
    },
  }),
});
