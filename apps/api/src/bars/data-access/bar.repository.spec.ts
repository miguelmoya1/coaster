import { asUserId } from '../../core';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { DbService } from '../../db';;
import { BarRepository } from './bar.repository';

describe('BarRepository', () => {
  let repository: BarRepository;
  let db: {
    dbBar: { create: Mock };
    dbBarMember: { findMany: Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      dbBar: { create: vi.fn() },
      dbBarMember: { findMany: vi.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [BarRepository, { provide: DbService, useValue: mockPrisma }],
    }).compile();

    repository = module.get<BarRepository>(BarRepository);
    db = module.get(DbService);
  });

  describe('create', () => {
    it('should create a bar with an OWNER member', async () => {
      db.dbBar.create.mockResolvedValue({ id: 'bar-1', name: 'Mi Bar' });

      const result = await repository.create(asUserId('user-1'), { name: 'Mi Bar' });

      expect(db.dbBar.create).toHaveBeenCalledWith({
        data: {
          name: 'Mi Bar',
          members: { create: { userId: 'user-1', role: 'OWNER' } },
        },
      });
      expect(result).toEqual({ id: 'bar-1', name: 'Mi Bar' });
    });
  });

  describe('findByUserId', () => {
    it('should return the user bars', async () => {
      db.dbBarMember.findMany.mockResolvedValue([
        { bar: { id: 'bar-1', name: 'Bar 1' } },
        { bar: { id: 'bar-2', name: 'Bar 2' } },
      ]);

      const result = await repository.findByUserId(asUserId('user-1'));

      expect(db.dbBarMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { bar: true },
      });
      expect(result).toEqual([
        { id: 'bar-1', name: 'Bar 1' },
        { id: 'bar-2', name: 'Bar 2' },
      ]);
    });
  });
});
