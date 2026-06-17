import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsReadRepository } from './stats.read.repository';
import { DbService, DbOrderStatus } from '../../db';
import { asBarId } from '../../core';

describe('StatsReadRepository', () => {
  let repository: StatsReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsReadRepository,
        {
          provide: DbService,
          useValue: {
            dbOrder: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<StatsReadRepository>(StatsReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findClosedOrdersForStats', () => {
    it('should call dbOrder.findMany with correct parameters', async () => {
      const barId = asBarId('bar-1');
      const startOfPrevYear = new Date('2023-01-01');
      const expectedResult = [{ totalAmount: 100, createdAt: new Date() }];
      vi.mocked(dbService.dbOrder.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findClosedOrdersForStats(barId, startOfPrevYear);

      expect(dbService.dbOrder.findMany).toHaveBeenCalledWith({
        where: {
          barId,
          status: DbOrderStatus.CLOSED,
          createdAt: { gte: startOfPrevYear },
        },
        select: {
          totalAmount: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
