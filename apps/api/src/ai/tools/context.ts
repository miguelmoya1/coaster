import type {
  EstablishmentId,
  EstablishmentModule,
  EstablishmentPermission,
  EstablishmentRole,
  Category,
  Order,
  Product,
  Table,
  User,
} from '@coaster/common';
import { ErrorCodes, hasPermission } from '@coaster/common';
import { Logger } from '@nestjs/common';
import type { CommandBus, ICommand, IQuery, QueryBus } from '@nestjs/cqrs';

const logger = new Logger('AiTools');

export interface AiToolsContext {
  establishmentId: EstablishmentId;
  modules: EstablishmentModule[];
  user: User;
  isAdmin: boolean;
  establishmentRole: EstablishmentRole;
  commandBus: CommandBus;
  queryBus: QueryBus;
  products: Product[];
  categories: Category[];
  tables: Table[];
  openOrders: Order[];
}

export type ToolResult =
  | { status: 'ok'; message: string; data?: unknown }
  | { status: 'denied'; message: string }
  | { status: 'error'; message: string; errorKey?: string }
  | { status: 'confirmation_required'; message: string };

export interface Confirmation {
  /** Plain description of the action, read back to the user before it runs. */
  summary: string;
  /** True only when the user already agreed to this exact action in a previous turn. */
  confirmed?: boolean;
}

export interface AiToolRunner {
  /** Runs a write command through the CommandBus once the permission (and confirmation) checks pass. */
  execute(permission: EstablishmentPermission, command: ICommand, confirmation?: Confirmation): Promise<ToolResult>;
  /** Runs a read query through the QueryBus once the permission check passes. */
  query<T>(permission: EstablishmentPermission, query: IQuery, project?: (value: T) => unknown): Promise<ToolResult>;
}

/** Rejects a tool call the assistant got wrong, without ever reaching the bus. */
export const failed = (message: string): ToolResult => ({ status: 'error', message });

export const createToolRunner = (context: AiToolsContext): AiToolRunner => {
  const { establishmentId, user, isAdmin, establishmentRole, commandBus, queryBus } = context;

  const allows = (permission: EstablishmentPermission): boolean =>
    isAdmin || hasPermission(establishmentRole, permission);

  const denied = (permission: EstablishmentPermission): ToolResult => {
    logger.warn(`User ${user.id} denied permission "${permission}" in establishment "${establishmentId}"`);
    return {
      status: 'denied',
      message: `The user's role (${isAdmin ? 'ADMIN' : establishmentRole}) does not allow this action. It requires the '${permission}' permission. Tell the user they lack permission and do not retry.`,
    };
  };

  const toError = (error: unknown): ToolResult => {
    const message = error instanceof Error ? error.message : String(error);
    const errorKey = Object.values(ErrorCodes).some((code) => code === message) ? message : undefined;
    logger.error(`[AI Tool] Action failed: ${message}`, error instanceof Error ? error.stack : undefined);
    return { status: 'error', message: `The action failed: ${message}`, errorKey };
  };

  return {
    async execute(permission, command, confirmation) {
      if (!allows(permission)) {
        return denied(permission);
      }

      if (confirmation && confirmation.confirmed !== true) {
        logger.debug(`[AI Tool] Awaiting user confirmation for "${permission}": ${confirmation.summary}`);
        return {
          status: 'confirmation_required',
          message: `This action is destructive and has NOT been executed. Ask the user to confirm out loud that you should ${confirmation.summary}, and only call this tool again with confirmed=true after they say yes.`,
        };
      }

      try {
        logger.debug(`[AI Tool] Executing command for permission "${permission}"`);
        const result = await commandBus.execute(command);
        return { status: 'ok', message: 'Action completed successfully.', data: result ?? undefined };
      } catch (error) {
        return toError(error);
      }
    },

    async query<T>(permission: EstablishmentPermission, query: IQuery, project?: (value: T) => unknown) {
      if (!allows(permission)) {
        return denied(permission);
      }

      try {
        logger.debug(`[AI Tool] Running query for permission "${permission}"`);
        const result = await queryBus.execute<IQuery, T>(query);
        return { status: 'ok', message: 'Query completed.', data: project ? project(result) : result };
      } catch (error) {
        return toError(error);
      }
    },
  };
};

/** Prices travel through the API in cents; the assistant always talks to the user in euros. */
export const toEuros = (cents: number): number => Math.round(cents) / 100;

export const toCents = (euros: number): number => Math.round(euros * 100);
