import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserWriteRepository } from './user.write.repository';
import { DbService } from '../../db';
import { asUserId } from '../../core';

describe('UserWriteRepository', () => {
  let repository: UserWriteRepository;
  let dbService: DbService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserWriteRepository,
        {
          provide: DbService,
          useValue: {
            dbUser: {
              update: vi.fn(),
              upsert: vi.fn(),
            },
          },
        },
      ],
    }).compile();

    repository = module.get<UserWriteRepository>(UserWriteRepository);
    dbService = module.get<DbService>(DbService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('update', () => {
    it('should call dbUser.update with correct parameters', async () => {
      const id = asUserId('user-1');
      const updateUserDto = { name: 'Updated Name' };
      const expectedResult = { id: 'user-1', name: 'Updated Name' };
      vi.mocked(dbService.dbUser.update).mockResolvedValue(expectedResult as any);

      const result = await repository.update(id, updateUserDto);

      expect(dbService.dbUser.update).toHaveBeenCalledWith({
        where: { id },
        data: { ...updateUserDto },
      });
      expect(result).toEqual(expectedResult);
    });
  });

  describe('upsert', () => {
    it('should call dbUser.upsert with correct parameters', async () => {
      const email = 'test@test.com';
      const data = {
        email,
        name: 'New User',
        googleId: 'g-123',
        photoUrl: 'http://example.com/photo.jpg',
        active: true,
        role: 'USER' as const,
      };
      const expectedResult = { id: 'user-1', ...data };
      vi.mocked(dbService.dbUser.upsert).mockResolvedValue(expectedResult as any);

      const result = await repository.upsert(email, data);

      expect(dbService.dbUser.upsert).toHaveBeenCalledWith({
        where: { email },
        update: {
          googleId: data.googleId,
          name: data.name,
          photoUrl: data.photoUrl,
          active: data.active,
        },
        create: data,
      });
      expect(result).toEqual(expectedResult);
    });
  });
});
