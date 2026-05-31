import { asBarId, asUserId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, PermissionsGuard } from '../../core';
import { CreateShiftCommand, DeleteShiftCommand } from '../commands';
import { GetShiftsQuery } from '../queries';
import { ShiftsController } from './shifts.controller';

describe('ShiftsController', () => {
  let controller: ShiftsController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ShiftsController>(ShiftsController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getShifts should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getShifts(asBarId('bar-1'), '2026-05-01T00:00:00Z', '2026-05-01T23:59:59Z');

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetShiftsQuery));
  });

  it('createShift should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({});
    const dto = {
      userId: asUserId('user-1'),
      startTime: '2026-05-01T08:00:00Z',
      endTime: '2026-05-01T16:00:00Z',
      role: 'staff',
    };

    await controller.createShift(asBarId('bar-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateShiftCommand));
  });

  it('deleteShift should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.deleteShift(asBarId('bar-1'), 'shift-1');

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteShiftCommand));
  });
});
