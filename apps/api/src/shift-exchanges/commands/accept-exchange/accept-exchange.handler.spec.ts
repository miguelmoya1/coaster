import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcceptExchangeHandler } from './accept-exchange.handler';
import { AcceptExchangeCommand } from './accept-exchange.command';
import { ShiftExchangesRepository } from '../../data-access/shift-exchanges.repository';
import { asBarId, asShiftExchangeId, asUserId, ShiftExchangeStatus } from '@coaster/common';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

describe('AcceptExchangeHandler', () => {
  let handler: AcceptExchangeHandler;
  let repository = {
    getExchangeById: vi.fn(),
    acceptExchangeAndSwapShift: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptExchangeHandler,
        { provide: ShiftExchangesRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<AcceptExchangeHandler>(AcceptExchangeHandler);
  });

  const barId = asBarId('bar-1');
  const excId = asShiftExchangeId('exc-1');

  it('should fail if the exchange does not exist', async () => {
    repository.getExchangeById.mockResolvedValue(null);

    await expect(
      handler.execute(new AcceptExchangeCommand(barId, excId, asUserId('acceptor')))
    ).rejects.toThrow(NotFoundException);
  });

  it('should approve if everything is correct and swap the shift', async () => {
    repository.getExchangeById.mockResolvedValue({
      id: 'exc-1',
      status: ShiftExchangeStatus.PENDING,
      requesterId: 'user-1',
      targetId: null,
      shiftId: 'shift-1',
      createdAt: new Date(),
      shift: { barId: 'bar-1' },
    });

    repository.acceptExchangeAndSwapShift.mockResolvedValue([
      {
        id: 'exc-1',
        status: ShiftExchangeStatus.APPROVED,
        shiftId: 'shift-1',
        requesterId: 'user-1',
        targetId: null,
        createdAt: new Date(),
        shift: { barId: 'bar-1' },
      },
    ]);

    const result = await handler.execute(new AcceptExchangeCommand(barId, excId, asUserId('acceptor')));

    expect(repository.acceptExchangeAndSwapShift).toHaveBeenCalledWith('exc-1', 'shift-1', 'acceptor');
    expect(result).toMatchObject({ id: 'exc-1', status: 'APPROVED' });
  });
});
