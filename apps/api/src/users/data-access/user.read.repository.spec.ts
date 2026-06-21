import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId } from '../../core';
import { DbService } from '../../core/db';
import { UserReadRepository } from './user.read.repository';

describe('UserReadRepository', () => {
  let repository: UserReadRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserReadRepository,
        {
          provide: DbService,
          useValue: {
            dbUser: {
              findUnique: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<UserReadRepository>(UserReadRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findById', () => {
    it('should call dbUser.findUnique with correct parameters', async () => {
      const id = asUserId('user-1');
      const expectedResult = { id: 'user-1', email: 'test@test.com' };
      vi.mocked(dbService.dbUser.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findById(id);

      expect(dbService.dbUser.findUnique).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findByEmail', () => {
    it('should call dbUser.findUnique with correct parameters', async () => {
      const email = 'test@test.com';
      const expectedResult = { id: 'user-1', email: 'test@test.com' };
      vi.mocked(dbService.dbUser.findUnique).mockResolvedValue(expectedResult as any);

      const result = await repository.findByEmail(email);

      expect(dbService.dbUser.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(expectedResult);
    });
  });
});
