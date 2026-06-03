import { asBarId, asUserId } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbService } from '../../db';;
import { ShiftsRepository } from './shifts.repository';

describe('ShiftsRepository', () => {
  let repository: ShiftsRepository;
  let db: {
    dbBarMember: { findUnique: Mock };
    dbShift: { create: Mock; findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbBarMember: { findUnique: vi.fn() },
      dbShift: { create: vi.fn(), findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ShiftsRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<ShiftsRepository>(ShiftsRepository);
    db = module.get(DbService);
  });

  describe('isUserMemberOfBar', () => {
    it('should return true if the member is active', async () => {
      db.dbBarMember.findUnique.mockResolvedValue({ active: true });

      const result = await repository.isUserMemberOfBar(asUserId('u1'), asBarId('bar-1'));

      expect(result).toBe(true);
    });

    it('should return false if it does not exist', async () => {
      db.dbBarMember.findUnique.mockResolvedValue(null);

      const result = await repository.isUserMemberOfBar(asUserId('u1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });

    it('should return false if it is inactive', async () => {
      db.dbBarMember.findUnique.mockResolvedValue({ active: false });

      const result = await repository.isUserMemberOfBar(asUserId('u1'), asBarId('bar-1'));

      expect(result).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a shift including user', async () => {
      const startTime = new Date('2026-03-20T08:00:00Z');
      const endTime = new Date('2026-03-20T16:00:00Z');
      db.dbShift.create.mockResolvedValue({ id: 'shift-1' });

      const result = await repository.create(asBarId('bar-1'), asUserId('u1'), {
        startTime,
        endTime,
        notes: 'notas',
      });

      expect(db.dbShift.create).toHaveBeenCalledWith({
        data: {
          bar: { connect: { id: 'bar-1' } },
          user: { connect: { id: 'u1' } },
          startTime,
          endTime,
          notes: 'notas',
        },
        include: { user: { select: { id: true, name: true, photoUrl: true } } },
      });
      expect(result).toEqual({ id: 'shift-1' });
    });
  });

  describe('findByBarId', () => {
    it('should find shifts with date filter', async () => {
      const startDate = new Date('2026-03-01');
      const endDate = new Date('2026-03-31');
      db.dbShift.findMany.mockResolvedValue([{ id: 'shift-1' }]);

      const result = await repository.findByBarId(asBarId('bar-1'), startDate, endDate);

      expect(db.dbShift.findMany).toHaveBeenCalledWith({
        where: {
          barId: 'bar-1',
          startTime: { gte: startDate, lte: endDate },
        },
        include: { user: { select: { id: true, name: true, photoUrl: true } } },
        orderBy: { startTime: 'asc' },
      });
      expect(result).toEqual([{ id: 'shift-1' }]);
    });

    it('should find without date filter if none provided', async () => {
      db.dbShift.findMany.mockResolvedValue([]);

      await repository.findByBarId(asBarId('bar-1'));

      expect(db.dbShift.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1' },
        include: { user: { select: { id: true, name: true, photoUrl: true } } },
        orderBy: { startTime: 'asc' },
      });
    });
  });
});
