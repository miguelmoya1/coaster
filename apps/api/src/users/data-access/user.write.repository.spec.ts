import { asUserId } from '@coaster/common';
import { DbService } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserWriteRepository } from './user.write.repository';

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
        include: { preferences: true },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should write the language into the preferences row rather than onto the user', async () => {
      const id = asUserId('user-1');
      vi.mocked(dbService.dbUser.update).mockResolvedValue({ id: 'user-1' } as any);

      await repository.update(id, { name: 'Updated Name' }, 'en');

      expect(dbService.dbUser.update).toHaveBeenCalledWith({
        where: { id },
        data: {
          name: 'Updated Name',
          preferences: { upsert: { create: { language: 'en' }, update: { language: 'en' } } },
        },
        include: { preferences: true },
      });
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
        create: { ...data, preferences: { create: {} } },
        include: { preferences: true },
      });
      expect(result).toEqual(expectedResult);
    });

    it('should give a brand new user its preferences row so the language never has nowhere to live', async () => {
      vi.mocked(dbService.dbUser.upsert).mockResolvedValue({ id: 'user-1' } as any);

      await repository.upsert('test@test.com', { email: 'test@test.com', name: 'New User' }, 'en');

      expect(dbService.dbUser.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ preferences: { create: { language: 'en' } } }),
          update: expect.objectContaining({
            preferences: { upsert: { create: { language: 'en' }, update: { language: 'en' } } },
          }),
        }),
      );
    });
  });
});
