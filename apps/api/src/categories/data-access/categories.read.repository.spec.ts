import { asEstablishmentId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesReadRepository } from './categories.read.repository';

describe('CategoriesReadRepository', () => {
  let repository: CategoriesReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesReadRepository,
        {
          provide: DbService,
          useValue: {
            dbCategory: {
              findMany: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<CategoriesReadRepository>(CategoriesReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByEstablishmentId', () => {
    it('should call dbCategory.findMany with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const expectedResult = [{ id: 'cat-1' }];
      vi.mocked(dbService.dbCategory.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByEstablishmentId(establishmentId);

      expect(dbService.dbCategory.findMany).toHaveBeenCalledWith({
        where: { establishmentId, deletedAt: null },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
