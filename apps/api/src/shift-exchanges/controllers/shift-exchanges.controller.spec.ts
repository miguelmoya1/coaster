import { asBarId, asShiftExchangeId, asShiftId, asUserId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, PermissionsGuard } from '../../core';
import { RequestExchangeCommand, AcceptExchangeCommand } from '../commands';
import { GetPendingExchangesQuery } from '../queries';
import { ShiftExchangesController } from './shift-exchanges.controller';

describe('ShiftExchangesController', () => {
  let controller: ShiftExchangesController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShiftExchangesController],
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

    controller = module.get<ShiftExchangesController>(ShiftExchangesController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getExchanges should delegate to query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getExchanges(asBarId('bar-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetPendingExchangesQuery));
  });

  it('createExchange should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({
      id: 'exch-1',
      shiftId: 'shift-1',
      requesterId: 'user-1',
      targetId: 'user-2',
      status: 'PENDING',
      createdAt: new Date(),
      shift: { startTime: new Date(), endTime: new Date() },
      requester: { id: 'user-1', name: 'User 1' },
    });
    const user = { id: asUserId('user-1'), name: 'User', email: 'u@u.com', active: true };
    const dto = { targetId: asUserId('user-2') };

    await controller.createExchange(asBarId('bar-1'), asShiftId('shift-1'), dto, user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RequestExchangeCommand));
  });

  it('acceptExchange should delegate to command bus', async () => {
    commandBus.execute.mockResolvedValue({
      id: 'exch-1',
      shiftId: 'shift-1',
      requesterId: 'user-1',
      targetId: 'user-2',
      status: 'ACCEPTED',
      createdAt: new Date(),
      shift: { startTime: new Date(), endTime: new Date() },
      requester: { id: 'user-1', name: 'User 1' },
    });
    const user = { id: asUserId('user-2'), name: 'User 2', email: 'u2@u.com', active: true };

    await controller.acceptExchange(asBarId('bar-1'), asShiftExchangeId('exch-1'), user);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(AcceptExchangeCommand));
  });
});
