import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asShiftId, asUserId, ShiftExchangeStatus } from '../../../core';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { RequestExchangeCommand } from './request-exchange.command';
import { RequestExchangeHandler } from './request-exchange.handler';

describe('RequestExchangeHandler', () => {
  let handler: RequestExchangeHandler;
  const repository = {
    getShiftById: vi.fn(),
    hasPendingExchangeForShift: vi.fn(),
    createExchange: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestExchangeHandler,
        { provide: ShiftExchangesWriteRepository, useValue: repository },
        { provide: ShiftExchangesReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<RequestExchangeHandler>(RequestExchangeHandler);
  });

  const barId = asBarId('bar-1');
  const shiftId = asShiftId('shift-1');
  const requesterId = asUserId('requester-1');
  const dto = { targetId: asUserId('target-id') };

  it('should fail if requesting someone else shift', async () => {
    repository.getShiftById.mockResolvedValue({
      id: 'shift-1',
      barId: 'bar-1',
      userId: 'otro-usuario',
      createdAt: new Date(),
      endTime: new Date(),
      notes: '',
      startTime: new Date(),
      updatedAt: new Date(),
    });

    await expect(handler.execute(new RequestExchangeCommand(barId, shiftId, requesterId, dto))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should create the exchange correctly if all rules validate', async () => {
    repository.getShiftById.mockResolvedValue({
      id: 'shift-1',
      barId: 'bar-1',
      userId: 'requester-1',
      createdAt: new Date(),
      endTime: new Date(),
      notes: '',
      startTime: new Date(),
      updatedAt: new Date(),
    });
    repository.hasPendingExchangeForShift.mockResolvedValue(false);
    repository.createExchange.mockResolvedValue({
      id: 'exchange-1',
      createdAt: new Date(),
      shiftId: 'shift-1',
      requesterId: 'requester-1',
      targetId: 'target-id',
      status: ShiftExchangeStatus.PENDING,
    });

    await handler.execute(new RequestExchangeCommand(barId, shiftId, requesterId, dto));

    expect(repository.createExchange).toHaveBeenCalledWith('shift-1', 'requester-1', 'target-id');
  });
});
