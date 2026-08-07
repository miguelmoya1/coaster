import type { Shift, ShiftExchange } from '@coaster/common';
import { asShiftExchangeId, asShiftId, asUserId } from '@coaster/core';
import {
  AcceptExchangeCommand,
  DeleteExchangeCommand,
  GetPendingExchangesQuery,
  RequestExchangeCommand,
} from '@coaster/shift-exchanges';
import { CreateShiftCommand, DeleteShiftCommand, GetShiftsQuery } from '@coaster/shifts';
import { Logger } from '@nestjs/common';
import { tool, zodSchema } from 'ai';
import { z } from 'zod';
import { createToolRunner, failed, type AiToolsContext, type ToolResult } from './context';

const logger = new Logger('ShiftTools');

const toInstant = (value: string): Temporal.Instant | null => {
  try {
    return Temporal.Instant.from(value);
  } catch {
    return null;
  }
};

export const createShiftTools = (context: AiToolsContext) => {
  const runner = createToolRunner(context);

  return {
    listShifts: tool({
      description:
        'List the scheduled shifts of the bar within a date range, with the worker assigned to each one. Use it for "¿quién trabaja mañana?" or "¿cuándo me toca turno?".',
      inputSchema: zodSchema(
        z.object({
          startDate: z
            .string()
            .optional()
            .describe('Start of the range as an ISO date-time, e.g. "2026-08-06T00:00:00Z". Defaults to all shifts.'),
          endDate: z.string().optional().describe('End of the range as an ISO date-time.'),
        }),
      ),
      execute: async ({ startDate, endDate }: { startDate?: string; endDate?: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listShifts' called with startDate="${startDate}", endDate="${endDate}"`);
        return runner.query<Shift[]>(
          'bar:view-shifts',
          new GetShiftsQuery(context.barId, startDate, endDate),
          (shifts) =>
            shifts.map((shift) => ({
              id: shift.id,
              worker: shift.userName,
              userId: shift.userId,
              startTime: shift.startTime,
              endTime: shift.endTime,
              notes: shift.notes,
            })),
        );
      },
    }),

    createShift: tool({
      description:
        'Schedule a shift for a member of the bar. Use listMembers first to resolve the worker name into a user UUID.',
      inputSchema: zodSchema(
        z.object({
          userId: z.string().describe('The user UUID of the worker taking the shift.'),
          startTime: z.string().describe('Shift start as an ISO date-time, e.g. "2026-08-07T16:00:00Z".'),
          endTime: z.string().describe('Shift end as an ISO date-time, e.g. "2026-08-07T23:00:00Z".'),
          notes: z.string().optional().describe('Optional note for the shift, e.g. "turno de cierre".'),
        }),
      ),
      execute: async ({
        userId,
        startTime,
        endTime,
        notes,
      }: {
        userId: string;
        startTime: string;
        endTime: string;
        notes?: string;
      }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'createShift' called with userId="${userId}", ${startTime} -> ${endTime}`);

        const start = toInstant(startTime);
        const end = toInstant(endTime);

        if (!start || !end) {
          return failed('The shift start and end must be valid ISO date-times, e.g. "2026-08-07T16:00:00Z".');
        }

        if (Temporal.Instant.compare(start, end) >= 0) {
          return failed('The shift end must be later than its start.');
        }

        return runner.execute(
          'bar:create-shift',
          new CreateShiftCommand(context.barId, {
            userId: asUserId(userId),
            startTime: start,
            endTime: end,
            notes,
          }),
        );
      },
    }),

    deleteShift: tool({
      description: 'Delete a scheduled shift. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          shiftId: z.string().describe('The UUID of the shift to delete. Use listShifts to find it.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the deletion in a previous turn.'),
        }),
      ),
      execute: async ({ shiftId, confirmed }: { shiftId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'deleteShift' called with shiftId="${shiftId}", confirmed=${confirmed}`);
        return runner.execute('bar:delete-shift', new DeleteShiftCommand(context.barId, asShiftId(shiftId)), {
          confirmed,
          summary: 'delete that scheduled shift',
        });
      },
    }),

    listShiftExchanges: tool({
      description: 'List the pending shift exchange requests of the bar, so staff can see which swaps are open.',
      inputSchema: zodSchema(z.object({})),
      execute: async (): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'listShiftExchanges' called`);
        return runner.query<ShiftExchange[]>(
          'bar:view-exchanges',
          new GetPendingExchangesQuery(context.barId),
          (exchanges) =>
            exchanges.map((exchange) => ({
              id: exchange.id,
              shiftId: exchange.shiftId,
              requester: exchange.requesterName,
              status: exchange.status,
              shiftStartTime: exchange.shiftStartTime,
              shiftEndTime: exchange.shiftEndTime,
            })),
        );
      },
    }),

    requestShiftExchange: tool({
      description:
        'Ask to swap one of the current user\'s own shifts, optionally targeting a specific colleague. Use it for "no puedo el sábado, ¿alguien me cambia el turno?".',
      inputSchema: zodSchema(
        z.object({
          shiftId: z.string().describe('The UUID of the shift the current user wants to give away.'),
          targetUserId: z
            .string()
            .optional()
            .describe('Optional user UUID of the colleague the swap is offered to. Omit to offer it to everyone.'),
        }),
      ),
      execute: async ({ shiftId, targetUserId }: { shiftId: string; targetUserId?: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'requestShiftExchange' called with shiftId="${shiftId}"`);
        return runner.execute(
          'bar:create-exchange',
          new RequestExchangeCommand(context.barId, asShiftId(shiftId), context.user.id, {
            targetId: targetUserId ? asUserId(targetUserId) : undefined,
          }),
        );
      },
    }),

    acceptShiftExchange: tool({
      description: 'Accept a pending shift exchange on behalf of the current user, taking over that shift.',
      inputSchema: zodSchema(
        z.object({
          exchangeId: z.string().describe('The UUID of the exchange request to accept.'),
        }),
      ),
      execute: async ({ exchangeId }: { exchangeId: string }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'acceptShiftExchange' called with exchangeId="${exchangeId}"`);
        return runner.execute(
          'bar:accept-exchange',
          new AcceptExchangeCommand(context.barId, asShiftExchangeId(exchangeId), context.user.id),
        );
      },
    }),

    cancelShiftExchange: tool({
      description: 'Withdraw a pending shift exchange request. Destructive: requires the user to confirm first.',
      inputSchema: zodSchema(
        z.object({
          exchangeId: z.string().describe('The UUID of the exchange request to withdraw.'),
          confirmed: z
            .boolean()
            .describe('Set to true only after the user has explicitly confirmed the withdrawal in a previous turn.'),
        }),
      ),
      execute: async ({ exchangeId, confirmed }: { exchangeId: string; confirmed: boolean }): Promise<ToolResult> => {
        logger.debug(`[AI Tool] 'cancelShiftExchange' called with exchangeId="${exchangeId}"`);
        return runner.execute(
          'bar:delete-exchange',
          new DeleteExchangeCommand(context.barId, asShiftExchangeId(exchangeId), context.user.id),
          { confirmed, summary: 'withdraw that shift exchange request' },
        );
      },
    }),
  };
};
