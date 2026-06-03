import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId, DbRole } from '../../../core';
import { UserRepository } from '../../data-access/user.repository';
import { UpsertUserCommand } from './upsert-user.command';
import { UpsertUserHandler } from './upsert-user.handler';

describe('UpsertUserHandler', () => {
  let handler: UpsertUserHandler;
  const repository = {
    upsert: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpsertUserHandler, { provide: UserRepository, useValue: repository }],
    }).compile();

    handler = module.get<UpsertUserHandler>(UpsertUserHandler);
  });

  it('should upsert the user correctly', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test Name',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    repository.upsert.mockResolvedValue(mockUser);

    const dto = {
      email: 'test@mail.com',
      name: 'Test Name',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
    };

    const result = await handler.execute(new UpsertUserCommand(dto));

    expect(repository.upsert).toHaveBeenCalledWith('test@mail.com', dto);
    expect(result).toEqual({
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Test Name',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
      role: DbRole.USER,
    });
  });
});
