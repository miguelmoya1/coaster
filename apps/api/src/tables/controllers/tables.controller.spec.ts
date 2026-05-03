import { asBarId, asTableId, type Table } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { TablesService } from '../services/tables.service';
import { TablesController } from './tables.controller';

describe('TablesController', () => {
  let controller: TablesController;
  let service: Mocked<TablesService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getTablesByBarId: vi.fn(),
      createTable: vi.fn(),
      updateTable: vi.fn(),
      deleteTable: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TablesController],
      providers: [{ provide: TablesService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<TablesController>(TablesController);
    service = module.get(TablesService);
  });

  it('getTables should delegate to the service', async () => {
    service.getTablesByBarId.mockResolvedValue([]);

    await controller.getTables(asBarId('bar-1'));

    expect(service.getTablesByBarId).toHaveBeenCalledWith('bar-1');
  });

  it('createTable should delegate to the service', async () => {
    service.createTable.mockResolvedValue({} as Table);
    const dto = { name: 'Mesa 1' };

    await controller.createTable(asBarId('bar-1'), dto);

    expect(service.createTable).toHaveBeenCalledWith('bar-1', dto);
  });

  it('updateTable should delegate to the service', async () => {
    service.updateTable.mockResolvedValue({} as Table);
    const dto = { name: 'Mesa 2' };

    await controller.updateTable(asBarId('bar-1'), asTableId('table-1'), dto);

    expect(service.updateTable).toHaveBeenCalledWith('bar-1', 'table-1', dto);
  });

  it('deleteTable should delegate to the service and return success', async () => {
    service.deleteTable.mockResolvedValue(undefined);

    const result = await controller.deleteTable(asBarId('bar-1'), asTableId('table-1'));

    expect(service.deleteTable).toHaveBeenCalledWith('bar-1', 'table-1');
    expect(result).toEqual({ success: true });
  });
});
