import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { CreateTableCommand, UpdateTableCommand } from '../../tables/commands';
import { asTableId } from '../../core';
import type { AiToolsData, PreparedAction } from './context';

const logger = new Logger('TableTools');

export const createTableTools = (data: AiToolsData) => ({
  createTable: tool({
    description: 'Create a new table in the bar.',
    inputSchema: zodSchema(z.object({
      name: z.string().describe("Table name or designation to create, e.g. 'Mesa 4', 'Terraza 1'. Use the exact name mentioned by the user."),
    })),
    execute: async ({ name }: { name: string }): Promise<PreparedAction> => {
      logger.debug(`[AI Tool] 'createTable' called with name="${name}"`);
      return {
        permission: 'bar:create-table',
        command: new CreateTableCommand(data.barId, { name }),
      };
    },
  }),

  updateTable: tool({
    description: 'Update details of an existing table in the bar, such as its name.',
    inputSchema: zodSchema(z.object({
      tableId: z.string().describe('The UUID of the table to update.'),
      name: z.string().describe('New name of the table.'),
    })),
    execute: async ({ tableId, name }: { tableId: string; name: string }): Promise<PreparedAction> => {
      logger.debug(`[AI Tool] 'updateTable' called with tableId="${tableId}", name="${name}"`);
      return {
        permission: 'bar:update-table',
        command: new UpdateTableCommand(data.barId, asTableId(tableId), { name }),
      };
    },
  }),
});
