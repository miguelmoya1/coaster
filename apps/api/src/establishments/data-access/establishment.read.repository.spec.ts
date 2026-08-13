import { asEstablishmentId, asUserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentReadRepository } from './establishment.read.repository';

describe('EstablishmentReadRepository', () => {
  let repository: EstablishmentReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentReadRepository,
        {
          provide: DbService,
          useValue: {
            dbEstablishment: {
              findMany: vi.fn(),
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<EstablishmentReadRepository>(EstablishmentReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should only list establishments where the membership is still live', async () => {
      const userId = asUserId('user-1');
      const expectedResult = [{ id: 'establishment-1', name: 'Establishment 1' }];
      vi.mocked(dbService.dbEstablishment.findMany).mockResolvedValue(expectedResult as any);

      const result = await repository.findByUserId(userId);

      expect(dbService.dbEstablishment.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId, active: true, deletedAt: null } } },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findById', () => {
    it('should call dbEstablishment.findUnique with correct parameters', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const expectedResult = { id: 'establishment-1', name: 'Establishment 1' };
      vi.mocked(dbService.dbEstablishment.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findById(establishmentId);

      expect(dbService.dbEstablishment.findUnique).toHaveBeenCalledWith({
        where: { id: establishmentId },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
