import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId } from '../../core';
import { DbBarRole, DbService } from '../../core/db';
import { BarWriteRepository } from './bar.write.repository';

describe('BarWriteRepository', () => {
  let repository: BarWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BarWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbBar: {
              create: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<BarWriteRepository>(BarWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should call dbBar.create with correct parameters', async () => {
      const userId = asUserId('user-1');
      const createBarDto = { name: 'New Bar', address: 'Street 123' };
      const expectedResult = { id: 'bar-1', ...createBarDto };
      vi.mocked(dbService.dbBar.create).mockResolvedValue(expectedResult as any);

      const result = await repository.create(userId, createBarDto as any);

      expect(dbService.dbBar.create).toHaveBeenCalledWith({
        data: {
          ...createBarDto,
          members: { create: { userId, role: DbBarRole.OWNER } },
        },
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
