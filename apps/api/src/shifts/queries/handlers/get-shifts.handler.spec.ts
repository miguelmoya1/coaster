import { asEstablishmentId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftsReadRepository } from '../../data-access/shifts.read.repository';
import { GetShiftsQuery } from '../impl/get-shifts.query';
import { GetShiftsHandler } from './get-shifts.handler';

describe('GetShiftsHandler', () => {
  let handler: GetShiftsHandler;
  const repository = {
    findByEstablishmentId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetShiftsHandler, { provide: ShiftsReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetShiftsHandler>(GetShiftsHandler);
  });

  it('should map list of shifts correctly and filter by date', async () => {
    repository.findByEstablishmentId.mockResolvedValue([
      {
        id: 'shift-1',
        establishmentId: 'establishment-1',
        userId: 'user-id',
        startTime: new Date('2026-03-20T10:00:00.000Z'),
        endTime: new Date('2026-03-20T10:00:00.000Z'),
        notes: null,
        user: null,
      },
    ]);

    const startIso = '2026-03-01T00:00:00Z';
    const endIso = '2026-03-31T23:59:59Z';

    const result = await handler.execute(new GetShiftsQuery(asEstablishmentId('establishment-1'), startIso, endIso));

    expect(repository.findByEstablishmentId).toHaveBeenCalledWith(
      'establishment-1',
      new Date(startIso),
      new Date(endIso),
    );
    expect(result).toEqual([
      {
        id: 'shift-1',
        startTime: '2026-03-20T10:00:00Z',
        endTime: '2026-03-20T10:00:00Z',
        userId: 'user-id',
        userName: '',
        userImage: undefined,
        establishmentId: 'establishment-1',
        notes: undefined,
      },
    ]);
  });

  it('should throw error if a datetime query param is invalid', async () => {
    await expect(
      handler.execute(new GetShiftsQuery(asEstablishmentId('establishment-1'), 'invalida', '2026-01-01T00:00:00Z')),
    ).rejects.toThrow(BadRequestException);
  });
});
