import { Logger } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import { UpdateCategoryCommand } from '../../categories/commands';
import { asCategoryId } from '../../core';
import type { AiToolsContext } from './context';

const logger = new Logger('CategoryTools');

export const createCategoryTools = (ctx: AiToolsContext) => ({
  updateCategory: tool({
    description: 'Update details of an existing category in the bar, such as its name or icon.',
    inputSchema: z.object({
      categoryId: z.string().describe('The UUID of the category to update.'),
      name: z.string().optional().describe('New name of the category.'),
      icon: z.string().optional().describe('New icon name of the category.'),
    }),
    execute: async ({ categoryId, name, icon }) => {
      logger.debug(
        `[AI Tool] 'updateCategory' called with categoryId="${categoryId}", name="${name}", icon="${icon}"`,
      );
      const existingCategory = ctx.categories.find((c) => c.id === categoryId);
      const nameToUse = name ?? existingCategory?.name;
      if (!nameToUse) {
        return `Error: Category name is required to update it.`;
      }
      return ctx.runAction('bar:update-category', () =>
        ctx.commandBus.execute<UpdateCategoryCommand, void>(
          new UpdateCategoryCommand(ctx.barId, asCategoryId(categoryId), {
            name: nameToUse,
            icon,
          }),
        ),
      );
    },
  }),
});
