import { asUserId } from '@coaster/common';
import { DbEstablishmentRole, DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentWriteRepository } from './establishment.write.repository';

describe('EstablishmentWriteRepository', () => {
  let repository: EstablishmentWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstablishmentWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbEstablishment: {
              create: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<EstablishmentWriteRepository>(EstablishmentWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call dbEstablishment.create with correct parameters', async () => {
      const userId = asUserId('user-1');
      const createEstablishmentDto = { name: 'New Establishment', address: 'Street 123' };
      const expectedResult = { id: 'establishment-1', ...createEstablishmentDto };
      vi.mocked(dbService.dbEstablishment.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(userId, createEstablishmentDto as any);

      expect(dbService.dbEstablishment.create).toHaveBeenCalledWith({
        data: {
          ...createEstablishmentDto,
          members: { create: { userId, role: DbEstablishmentRole.OWNER } },
          billing: {
            create: {
              plan: 'FREE',
              status: 'TRIALING',
              trialEndsAt: expect.any(Date),
            },
          },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
