import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BarWriteRepository } from './bar.write.repository';
import { DbService, DbBarRole } from '../../db';
import { asUserId } from '../../core';

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
