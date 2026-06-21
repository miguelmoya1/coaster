import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asShiftId, asUserId } from '../../core';
import { DbService } from '../../core/db';
import { ShiftsReadRepository } from './shifts.read.repository';

describe('ShiftsReadRepository', () => {
  let repository: ShiftsReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShiftsReadRepository,
        {
          provide: DbService,
          useValue: {
            dbBarMember: {
              findUnique: vi.fn(),
            },
            dbShift: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<ShiftsReadRepository>(ShiftsReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('isUserMemberOfBar', () => {
    it('should return true if active member', async () => {
      const userId = asUserId('user-1');
      const barId = asBarId('bar-1');
      vi.mocked(dbService.dbBarMember.findUnique).mockResolvedValue({ active: true } as any);

      const result = await repository.isUserMemberOfBar(userId, barId);

      expect(dbService.dbBarMember.findUnique).toHaveBeenCalledWith({
        where: { userId_barId: { userId, barId } },
        select: { active: true },
      });
      expect(result).toBe(true);
    });

    it('should return false if not active member', async () => {
      const userId = asUserId('user-1');
      const barId = asBarId('bar-1');
      vi.mocked(dbService.dbBarMember.findUnique).mockResolvedValue({ active: false } as any);

      const result = await repository.isUserMemberOfBar(userId, barId);
      expect(result).toBe(false);
    });

    it('should return false if member not found', async () => {
      const userId = asUserId('user-1');
      const barId = asBarId('bar-1');
      vi.mocked(dbService.dbBarMember.findUnique).mockResolvedValue(null as any);

      const result = await repository.isUserMemberOfBar(userId, barId);
      expect(result).toBe(false);
    });
  });

  describe('findByBarId', () => {
    it('should call dbShift.findMany without dates', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = [{ id: 'shift-1' }];
      vi.mocked(dbService.dbShift.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByBarId(barId);

      expect(dbService.dbShift.findMany).toHaveBeenCalledWith({
        where: { barId },
        include: { user: { select: { id: true, name: true, photoUrl: true } } },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should call dbShift.findMany with dates', async () => {
      const barId = asBarId('bar-1');
      const startDate = new Date();
      const endDate = new Date();
      const expectedResult = [{ id: 'shift-1' }];
      vi.mocked(dbService.dbShift.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByBarId(barId, startDate, endDate);

      expect(dbService.dbShift.findMany).toHaveBeenCalledWith({
        where: { barId, startTime: { gte: startDate, lte: endDate } },
        include: { user: { select: { id: true, name: true, photoUrl: true } } },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should call dbShift.findUnique with correct parameters', async () => {
      const shiftId = asShiftId('shift-1');
      const expectedResult = { id: 'shift-1' };
      vi.mocked(dbService.dbShift.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findById(shiftId);

      expect(dbService.dbShift.findUnique).toHaveBeenCalledWith({
        where: { id: shiftId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
