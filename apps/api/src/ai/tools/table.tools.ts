import type { Table } from '@coaster/common';
import { asTableId } from '@coaster/common';
import {
  CreateTableCommand,
  DeleteTableCommand,
  GetTablesByEstablishmentIdQuery,
  UpdateTableCommand,
} from '@coaster/tables';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('TableTools');

export const createTableTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    listTables: tool({
      description:
        'List every table of the establishment with its UUID and status. Use it to refresh the table list or when a table the user mentions is not in the context above.',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listTables' called`);
        return runner.query<Table[]>(
          'establishment:view-tables',
          new GetTablesByEstablishmentIdQuery(context.establishmentId),
          (tables) => tables.map((table) => ({ id: table.id, name: table.name, status: table.status })),
        );
      },
    }),

    createTable: tool({
      description: 'Create a new table in the establishment.',
      inputSchema: zodSchema(
        z.object({
          name: z
            .string()
            .describe(
              "Table name or designation to create, e.g. 'Mesa 4', 'Terraza 1'. Use the exact name mentioned by the user.",
            ),
        }),
      ),
      execute: async ({ name }: { name: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'createTable' called with name="${name}"`);
        return runner.execute('establishment:create-table', new CreateTableCommand(context.establishmentId, { name }));
      },
    }),

    updateTable: tool({
      description: 'Update details of an existing table in the establishment, such as its name.',
      inputSchema: zodSchema(
        z.object({
          tableId: z.string().describe('The UUID of the table to update.'),
          name: z.string().describe('New name of the table.'),
        }),
      ),
      execute: async ({ tableId, name }: { tableId: string; name: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'updateTable' called with tableId="${tableId}", name="${name}"`);
        return runner.execute(
          'establishment:update-table',
          new UpdateTableCommand(context.establishmentId, asTableId(tableId), { name }),
        );
      },
    }),

    deleteTable: tool({
      description:
        'Permanently delete a table from the establishment. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          tableId: z.string().describe('The UUID of the table to delete.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the deletion in a previous turn.'),
        }),
      ),
      execute: async ({ tableId, confirmed }: { tableId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'deleteTable' called with tableId="${tableId}", confirmed=${confirmed}`);
        const table = context.tables.find((candidate) => candidate.id === tableId);
        return runner.execute(
          'establishment:delete-table',
          new DeleteTableCommand(context.establishmentId, asTableId(tableId)),
          {
            confirmed,
            summary: `permanently delete the table "${table?.name ?? tableId}"`,
          },
        );
      },
    }),
  };
};
