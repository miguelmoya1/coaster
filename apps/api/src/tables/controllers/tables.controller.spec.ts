import { asBarId, asTableId } from '../../core';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { BarPermissionsGuard } from '../../core';
import { FirebaseAuthGuard } from '../../auth';
import { CreateTableCommand, UpdateTableCommand, DeleteTableCommand } from '../commands';
import { GetTablesByBarIdQuery } from '../queries';
import { TablesController } from './tables.controller';

describe('TablesController', () => {
  let controller: TablesController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(BarPermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TablesController>(TablesController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getTables should delegate to the query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getTables(asBarId('bar-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetTablesByBarIdQuery));
  });

  it('createTable should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { name: 'Mesa 1' };

    await controller.createTable(asBarId('bar-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateTableCommand));
  });

  it('updateTable should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { name: 'Mesa 2' };

    await controller.updateTable(asBarId('bar-1'), asTableId('table-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateTableCommand));
  });

  it('deleteTable should delegate to the command bus and return success', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const result = await controller.deleteTable(asBarId('bar-1'), asTableId('table-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteTableCommand));
    expect(result).toEqual({ success: true });
  });
});
