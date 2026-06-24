import { Logger } from '@nestjs/common';
import { tool } from 'ai';
import { z } from 'zod';
import { CreateTableCommand, UpdateTableCommand } from '../../tables/commands';
import { asTableId } from '../../core';
import type { AiToolsContext } from './context';

const logger = new Logger('TableTools');

export const createTableTools = (ctx: AiToolsContext) => ({
  createTable: tool({
    description: 'Create a new table in the bar.',
    inputSchema: z.object({
      name: z.string().describe("Table name or designation to create, e.g. 'Mesa 4', 'Terraza 1'. Use the exact name mentioned by the user."),
    }),
    execute: async ({ name }) => {
      logger.debug(`[AI Tool] 'createTable' called with name="${name}"`);
      return ctx.runAction('bar:create-table', () =>
        ctx.commandBus.execute<CreateTableCommand, void>(new CreateTableCommand(ctx.barId, { name })),
      );
    },
  }),

  updateTable: tool({
    description: 'Update details of an existing table in the bar, such as its name.',
    inputSchema: z.object({
      tableId: z.string().describe('The UUID of the table to update.'),
      name: z.string().describe('New name of the table.'),
    }),
    execute: async ({ tableId, name }) => {
      logger.debug(`[AI Tool] 'updateTable' called with tableId="${tableId}", name="${name}"`);
      return ctx.runAction('bar:update-table', () =>
        ctx.commandBus.execute<UpdateTableCommand, void>(
          new UpdateTableCommand(ctx.barId, asTableId(tableId), { name }),
        ),
      );
    },
  }),
});
