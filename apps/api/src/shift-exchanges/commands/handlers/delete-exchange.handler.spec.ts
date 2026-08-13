import { ErrorCodes, ShiftExchangeStatus, asEstablishmentId, asShiftExchangeId, asUserId } from '@coaster/common';
import { DbEstablishmentRole } from '@coaster/core/db';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftExchangesReadRepository } from '../../data-access/shift-exchanges.read.repository';
import { ShiftExchangesWriteRepository } from '../../data-access/shift-exchanges.write.repository';
import { DeleteExchangeCommand } from '../impl/delete-exchange.command';
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
            getEstablishmentMember: vi.fn(),
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
  const establishmentId = asEstablishmentId('establishment-1');
  const userId = asUserId('user-1');

  it('should throw NotFoundException if exchange does not exist', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND));
  });

  it('should throw NotFoundException if exchange belongs to another establishment', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({ shift: { establishmentId: 'establishment-2' } } as any);

    await expect(handler.execute(command)).rejects.toThrow(new NotFoundException(ErrorCodes.EXCHANGE_NOT_FOUND));
  });

  it('should throw ForbiddenException if member does not exist or is inactive', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { establishmentId: 'establishment-1' },
      status: ShiftExchangeStatus.PENDING,
    } as any);
    vi.mocked(readRepo.getEstablishmentMember).mockResolvedValue(null as any);

    await expect(handler.execute(command)).rejects.toThrow(new ForbiddenException(ErrorCodes.MEMBER_NOT_FOUND));
  });

  it('should let the OWNER withdraw an offer somebody else published', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { establishmentId: 'establishment-1' },
      requesterId: 'other-user',
      status: ShiftExchangeStatus.PENDING,
    } as any);
    vi.mocked(readRepo.getEstablishmentMember).mockResolvedValue({ active: true, role: DbEstablishmentRole.OWNER });

    await handler.execute(command);

    expect(writeRepo.deleteExchange).toHaveBeenCalledWith(exchangeId);
  });

  it('should refuse to erase a closed exchange, even for the OWNER', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { establishmentId: 'establishment-1' },
      requesterId: 'other-user',
      status: ShiftExchangeStatus.APPROVED,
    } as any);
    vi.mocked(readRepo.getEstablishmentMember).mockResolvedValue({ active: true, role: DbEstablishmentRole.OWNER });

    await expect(handler.execute(command)).rejects.toThrow(new BadRequestException(ErrorCodes.EXCHANGE_ALREADY_CLOSED));
    expect(writeRepo.deleteExchange).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenException if non-OWNER tries to delete someone else exchange', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { establishmentId: 'establishment-1' },
      requesterId: 'other-user',
      status: ShiftExchangeStatus.PENDING,
    } as any);
    vi.mocked(readRepo.getEstablishmentMember).mockResolvedValue({ active: true, role: DbEstablishmentRole.STAFF });

    await expect(handler.execute(command)).rejects.toThrow(new ForbiddenException(ErrorCodes.UNAUTHORIZED));
  });

  it('should refuse to erase a closed exchange for anybody else either', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { establishmentId: 'establishment-1' },
      requesterId: userId,
      status: ShiftExchangeStatus.APPROVED,
    } as any);
    vi.mocked(readRepo.getEstablishmentMember).mockResolvedValue({ active: true, role: DbEstablishmentRole.STAFF });

    await expect(handler.execute(command)).rejects.toThrow(new BadRequestException(ErrorCodes.EXCHANGE_ALREADY_CLOSED));
  });

  it('should allow non-OWNER to delete their own PENDING exchange', async () => {
    const command = new DeleteExchangeCommand(establishmentId, exchangeId, userId);
    vi.mocked(readRepo.getExchangeById).mockResolvedValue({
      shift: { establishmentId: 'establishment-1' },
      requesterId: userId,
      status: ShiftExchangeStatus.PENDING,
    } as any);
    vi.mocked(readRepo.getEstablishmentMember).mockResolvedValue({ active: true, role: DbEstablishmentRole.STAFF });

    await handler.execute(command);

    expect(writeRepo.deleteExchange).toHaveBeenCalledWith(exchangeId);
  });
});
