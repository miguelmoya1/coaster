import { asBarId, asUserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarReadRepository } from './bar.read.repository';

describe('BarReadRepository', () => {
  let repository: BarReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarReadRepository,
        {
          provide: DbService,
          useValue: {
            dbBar: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<BarReadRepository>(BarReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should only list bars where the membership is still live', async () => {
      const userId = asUserId('user-1');
      const expectedResult = [{ id: 'bar-1', name: 'Bar 1' }];
      vi.mocked(dbService.dbBar.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByUserId(userId);

      expect(dbService.dbBar.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId, active: true, deletedAt: null } } },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should call dbBar.findUnique with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const expectedResult = { id: 'bar-1', name: 'Bar 1' };
      vi.mocked(dbService.dbBar.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findById(barId);

      expect(dbService.dbBar.findUnique).toHaveBeenCalledWith({
        where: { id: barId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
