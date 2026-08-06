import type { User } from '@coaster/common';
import { BarRole } from '@coaster/common';
import { asBarId, asUserId } from '@coaster/core';
import type { CommandBus, QueryBus } from '@nestjs/cqrs';
import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createToolRunner, toCents, toEuros, type AiToolsContext } from './context';

describe('createToolRunner', () => {
  const commandBus = { execute: vi.fn() };
  const queryBus = { execute: vi.fn() };

  const buildContext = (overrides: Partial<AiToolsContext> = {}): AiToolsContext => ({
    barId: asBarId('bar-1'),
    user: { id: asUserId('user-1'), name: 'Ana' } as User,
    isAdmin: false,
    barRole: BarRole.STAFF,
    commandBus: commandBus as unknown as CommandBus,
    queryBus: queryBus as unknown as QueryBus,
    products: [],
    categories: [],
    tables: [],
    openOrders: [],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('runs the command when the role grants the permission', async () => {
      commandBus.execute.mockResolvedValue({ id: 'order-1' });
      const runner = createToolRunner(buildContext());

      const result = await runner.execute('bar:create-order', { type: 'CreateOrder' });

      expect(commandBus.execute).toHaveBeenCalledWith({ type: 'CreateOrder' });
      expect(result.status).toBe('ok');
    });

    it('refuses without touching the CommandBus when the role lacks the permission', async () => {
      const runner = createToolRunner(buildContext({ barRole: BarRole.STAFF }));

      const result = await runner.execute('bar:delete-product', { type: 'DeleteProduct' });

      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(result.status).toBe('denied');
    });

    it('lets a platform admin through any permission', async () => {
      commandBus.execute.mockResolvedValue(undefined);
      const runner = createToolRunner(buildContext({ isAdmin: true, barRole: BarRole.STAFF }));

      const result = await runner.execute('bar:delete-product', { type: 'DeleteProduct' });

      expect(commandBus.execute).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('holds a destructive action back until the user confirms', async () => {
      const runner = createToolRunner(buildContext({ barRole: BarRole.OWNER }));

      const result = await runner.execute(
        'bar:delete-table',
        { type: 'DeleteTable' },
        { confirmed: false, summary: 'delete the table "Mesa 4"' },
      );

      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(result.status).toBe('confirmation_required');
      expect(result.message).toContain('delete the table "Mesa 4"');
    });

    it('runs the destructive action once it is confirmed', async () => {
      commandBus.execute.mockResolvedValue(undefined);
      const runner = createToolRunner(buildContext({ barRole: BarRole.OWNER }));

      const result = await runner.execute(
        'bar:delete-table',
        { type: 'DeleteTable' },
        { confirmed: true, summary: 'delete the table "Mesa 4"' },
      );

      expect(commandBus.execute).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('checks the permission before the confirmation, so a denial is never framed as a question', async () => {
      const runner = createToolRunner(buildContext({ barRole: BarRole.STAFF }));

      const result = await runner.execute(
        'bar:delete-table',
        { type: 'DeleteTable' },
        { confirmed: true, summary: 'delete the table "Mesa 4"' },
      );

      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(result.status).toBe('denied');
    });

    it('reports a failing command as an error carrying the known error code', async () => {
      commandBus.execute.mockRejectedValue(new Error('ORDER_NOT_FOUND'));
      const runner = createToolRunner(buildContext());

      const result = await runner.execute('bar:create-order', { type: 'CreateOrder' });

      expect(result.status).toBe('error');
      expect(result).toMatchObject({ errorKey: 'ORDER_NOT_FOUND' });
    });
  });

  describe('query', () => {
    it('projects the query result so the model only sees what it needs', async () => {
      queryBus.execute.mockResolvedValue([{ id: 't-1', name: 'Mesa 1', barId: 'bar-1' }]);
      const runner = createToolRunner(buildContext());

      const result = await runner.query<{ id: string; name: string }[]>(
        'bar:view-tables',
        { type: 'GetTables' },
        (tables) => tables.map((table) => table.name),
      );

      expect(result).toMatchObject({ status: 'ok', data: ['Mesa 1'] });
    });

    it('refuses a read the role is not allowed to make', async () => {
      const runner = createToolRunner(buildContext({ barRole: BarRole.STAFF }));

      const result = await runner.query('bar:view-dashboard', { type: 'GetBarStats' });

      expect(queryBus.execute).not.toHaveBeenCalled();
      expect(result.status).toBe('denied');
    });
  });

  describe('money conversion', () => {
    it('converts cents to euros and back', () => {
      expect(toEuros(250)).toBe(2.5);
      expect(toCents(2.5)).toBe(250);
      expect(toCents(0.1 + 0.2)).toBe(30);
    });
  });
});
