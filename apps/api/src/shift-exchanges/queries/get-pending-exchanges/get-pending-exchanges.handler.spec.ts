import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GetPendingExchangesHandler } from './get-pending-exchanges.handler';
import { GetPendingExchangesQuery } from './get-pending-exchanges.query';
import { ShiftExchangesRepository } from '../../data-access/shift-exchanges.repository';
import { asBarId, ShiftExchangeStatus } from '@coaster/common';

describe('GetPendingExchangesHandler', () => {
  let handler: GetPendingExchangesHandler;
  let repository = {
    findPendingByBarId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPendingExchangesHandler,
        { provide: ShiftExchangesRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<GetPendingExchangesHandler>(GetPendingExchangesHandler);
  });

  it('should call the repository', async () => {
    repository.findPendingByBarId.mockResolvedValue([
      {
        id: 'exc-1',
        shiftId: 'shift-1',
        requesterId: 'user-1',
        targetId: null,
        status: ShiftExchangeStatus.PENDING,
        shift: {
          startTime: new Date('2026-04-17T09:00:00.000Z'),
          endTime: new Date('2026-04-17T17:00:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
          notes: '',
          barId: 'bar-1',
          userId: 'user-1',
        },
        createdAt: new Date(),
        requester: { id: 'user-1', name: 'John' },
      },
    ]);

    const result = await handler.execute(new GetPendingExchangesQuery(asBarId('bar-1')));

    expect(repository.findPendingByBarId).toHaveBeenCalledWith('bar-1');
    expect(result).toMatchObject([
      {
        id: 'exc-1',
        shiftId: 'shift-1',
        requesterId: 'user-1',
        targetId: undefined,
        status: ShiftExchangeStatus.PENDING,
        requesterName: 'John',
        shiftStartTime: '2026-04-17T09:00:00.000Z',
        shiftEndTime: '2026-04-17T17:00:00.000Z',
      },
    ]);
  });
});
