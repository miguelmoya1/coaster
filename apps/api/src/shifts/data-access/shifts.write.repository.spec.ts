import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShiftsWriteRepository } from './shifts.write.repository';
import { DbService } from '../../db';
import { asBarId, asUserId, asShiftId } from '../../core';

describe('ShiftsWriteRepository', () => {
  let repository: ShiftsWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbShift: {
              create: vi.fn(),
              delete: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ShiftsWriteRepository>(ShiftsWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call dbShift.create with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const userId = asUserId('user-1');
      const createShiftDto = { startTime: new Date(), endTime: new Date() };
      const expectedResult = { id: 'shift-1' };
      vi.mocked(dbService.dbShift.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(barId, userId, createShiftDto as any);

      expect(dbService.dbShift.create).toHaveBeenCalledWith({
        data: {
          ...createShiftDto,
          bar: { connect: { id: barId } },
          user: { connect: { id: userId } },
        },
        include: {
          user: { select: { id: true, name: true, photoUrl: true } },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('delete', () => {
    it('should call dbShift.delete with correct parameters', async () => {
      const shiftId = asShiftId('shift-1');
      const expectedResult = { id: 'shift-1' };
      vi.mocked(dbService.dbShift.delete).mockResolvedValue(expectedResult as any);

      const result = await repository.delete(shiftId);

      expect(dbService.dbShift.delete).toHaveBeenCalledWith({
        where: { id: shiftId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
