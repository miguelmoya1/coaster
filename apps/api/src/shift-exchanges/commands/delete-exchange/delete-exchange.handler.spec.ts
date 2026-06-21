import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorCodes, ShiftExchangeStatus, asBarId, asShiftExchangeId, asUserId } from '../../../core';
import { DbBarRole } from '../../../core/db';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { DeleteExchangeCommand } from './delete-exchange.command';
import { DeleteExchangeHandler } from './delete-exchange.handler';

describe('DeleteExchangeHandler', () => {
  let handler: DeleteExchangeHandler;
  let readRepo: ShiftExchangesReadRepository;
  let writeRepo: ShiftExchangesWriteRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteExchangeHandler,
        {
          provide: ShiftExchangesReadRepository,
          useValue: {
            getExchangeById: vi.fn(),
            getBarMember: vi.fn(),
          },
        },
        {
          provide: ShiftExchangesWriteRepository,
          useValue: {
            deleteExchange: vi.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<DeleteExchangeHandler>(DeleteExchangeHandler);
    readRepo = module.get<ShiftExchangesReadRepository>(ShiftExchangesReadRepository);
    writeRepo = module.get<ShiftExchangesWriteRepository>(ShiftExchangesWriteRepository);
  });

  const exchangeId = asShiftExchangeId('exc-1');
  const barId = asBarId('bar-1');
  const userId = asUserId('user-1');

  it('should throw NotFoundException if exchange does not exist', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND));
  });

  it('should throw NotFoundException if exchange belongs to another bar', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({ shift: { barId: 'bar-2' } } as any);

    await expect(handler.execute(command)).rejects.toThrow(new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND));
  });

  it('should throw ForbiddenException if member does not exist or is inactive', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({ shift: { barId: 'bar-1' } } as any);
    vi.mocked(readRepo.getBarMember).mockResolvedValue(null as any);

    await expect(handler.execute(command)).rejects.toThrow(new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND));
  });

  it('should allow OWNER to delete exchange regardless of status or requester', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { barId: 'bar-1' },
      requesterId: 'other-user',
      status: ShiftExchangeStatus.APPROVED,
    } as any);
    vi.mocked(readRepo.getBarMember).mockResolvedValue({ active: true, role: DbBarRole.OWNER } as any);

    await handler.execute(command);

    expect(writeRepo.deleteExchange).toHaveBeenCalledWith(exchangeId);
  });

  it('should throw ForbiddenException if non-OWNER tries to delete someone else exchange', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { barId: 'bar-1' },
      requesterId: 'other-user',
      status: ShiftExchangeStatus.PENDING,
    } as any);
    vi.mocked(readRepo.getBarMember).mockResolvedValue({ active: true, role: DbBarRole.BARTENDER } as any);

    await expect(handler.execute(command)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
  });

  it('should throw BadRequestException if non-OWNER tries to delete non-PENDING exchange', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { barId: 'bar-1' },
      requesterId: userId,
      status: ShiftExchangeStatus.APPROVED,
    } as any);
    vi.mocked(readRepo.getBarMember).mockResolvedValue({ active: true, role: DbBarRole.BARTENDER } as any);

    await expect(handler.execute(command)).rejects.toThrow(new BadRequestException(ErrorCodes.INVALID_EXCHANGE));
  });

  it('should allow non-OWNER to delete their own PENDING exchange', async () => {
    const command = new DeleteExchangeCommand(barId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { barId: 'bar-1' },
      requesterId: userId,
      status: ShiftExchangeStatus.PENDING,
    } as any);
    vi.mocked(readRepo.getBarMember).mockResolvedValue({ active: true, role: DbBarRole.BARTENDER } as any);

    await handler.execute(command);

    expect(writeRepo.deleteExchange).toHaveBeenCalledWith(exchangeId);
  });
});
