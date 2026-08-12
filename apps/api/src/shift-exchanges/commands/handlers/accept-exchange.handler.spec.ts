import { ErrorCodes, ShiftExchangeStatus, asEstablishmentId, asShiftExchangeId, asUserId } from '@coaster/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { AcceptExchangeCommand } from '../impl/accept-exchange.command';
import { AcceptExchangeHandler } from './accept-exchange.handler';

describe('AcceptExchangeHandler', () => {
  let handler: AcceptExchangeHandler;
  const repository = {
    getExchangeById: vi.fn(),
    acceptExchangeAndSwapShift: vi.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcceptExchangeHandler,
        { provide: ShiftExchangesWriteRepository, useValue: repository },
        { provide: ShiftExchangesReadRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<AcceptExchangeHandler>(AcceptExchangeHandler);
  });

  const establishmentId = asEstablishmentId('establishment-1');
  const excId = asShiftExchangeId('exc-1');

  it('should fail if the exchange does not exist', async () => {
    repository.getExchangeById.mockResolvedValue(null);

    await expect(
      handler.execute(new AcceptExchangeCommand(establishmentId, excId, asUserId('acceptor'))),
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
      shift: { establishmentId: 'establishment-1', startTime: new Date(Date.now() + 3600 * 1000) },
    });

    repository.acceptExchangeAndSwapShift.mockResolvedValue([
      {
        id: 'exc-1',
        status: ShiftExchangeStatus.APPROVED,
        shiftId: 'shift-1',
        requesterId: 'user-1',
        targetId: null,
        createdAt: new Date(),
        shift: { establishmentId: 'establishment-1', startTime: new Date(Date.now() + 3600 * 1000) },
      },
    ]);

    await handler.execute(new AcceptExchangeCommand(establishmentId, excId, asUserId('acceptor')));

    expect(repository.acceptExchangeAndSwapShift).toHaveBeenCalledWith('exc-1', 'shift-1', 'acceptor');
  });

  it('should tell the loser of a race that the offer is gone instead of pretending it worked', async () => {
    repository.acceptExchangeAndSwapShift.mockResolvedValue(false);

    await expect(
      handler.execute(
        new AcceptExchangeCommand(
          asEstablishmentId('establishment-1'),
          asShiftExchangeId('exc-1'),
          asUserId('acceptor'),
        ),
      ),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.INVALID_EXCHANGE));
  });

  it('should refuse to hand over a shift that already started', async () => {
    repository.acceptExchangeAndSwapShift.mockClear();
    repository.getExchangeById.mockResolvedValue({
      id: 'exc-1',
      status: ShiftExchangeStatus.PENDING,
      requesterId: 'user-1',
      targetId: null,
      shiftId: 'shift-1',
      createdAt: new Date(),
      shift: { establishmentId: 'establishment-1', startTime: new Date(Date.now() - 60 * 1000) },
    });

    await expect(
      handler.execute(
        new AcceptExchangeCommand(
          asEstablishmentId('establishment-1'),
          asShiftExchangeId('exc-1'),
          asUserId('acceptor'),
        ),
      ),
    ).rejects.toThrow(new BadRequestException(ErrorCodes.EXCHANGE_SHIFT_ALREADY_STARTED));

    expect(repository.acceptExchangeAndSwapShift).not.toHaveBeenCalled();
  });
});
