import { asUserId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { UserRepository } from '../data-access/user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let repository: Mocked<UserRepository>;

  beforeEach(async () => {
    const mockRepo = { getById: vi.fn(), update: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: UserRepository, useValue: mockRepo }],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(UserRepository);
  });

  it('should return null if the user does not exist', async () => {
    repository.getById.mockResolvedValue(null);

    const result = await service.getById(asUserId('no-exist'));

    expect(repository.getById).toHaveBeenCalledWith('no-exist');
    expect(result).toBeNull();
  });

  it('should map db user to domain correctly', async () => {
    repository.getById.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getById(asUserId('user-1'));

    expect(result).toEqual({
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
    });
  });

  it('should map null googleId to undefined and null photoUrl to fallback avatar', async () => {
    repository.getById.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test',
      googleId: null,
      photoUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getById(asUserId('user-1'));

    expect(result?.googleId).toBeUndefined();
    expect(result?.photoUrl).toBe('https://ui-avatars.com/api/?name=Test&background=0F172A&color=fff');
  });

  it('should update the user correctly', async () => {
    repository.update.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Updated Name',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/2',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.update(asUserId('user-1'), {
      name: 'Updated Name',
      photoUrl: 'http://photo.com/2',
    });

    expect(repository.update).toHaveBeenCalledWith('user-1', {
      name: 'Updated Name',
      photoUrl: 'http://photo.com/2',
    });
    expect(result).toEqual({
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Updated Name',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/2',
      active: true,
    });
  });
});
