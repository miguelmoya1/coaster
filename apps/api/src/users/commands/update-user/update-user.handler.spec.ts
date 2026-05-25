import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdateUserHandler } from './update-user.handler';
import { UpdateUserCommand } from './update-user.command';
import { UserRepository } from '../../data-access/user.repository';
import { asUserId } from '@coaster/common';

describe('UpdateUserHandler', () => {
  let handler: UpdateUserHandler;
  let repository = {
    update: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserHandler,
        { provide: UserRepository, useValue: repository },
      ],
    }).compile();

    handler = module.get<UpdateUserHandler>(UpdateUserHandler);
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

    const result = await handler.execute(new UpdateUserCommand(asUserId('user-1'), {
      name: 'Updated Name',
      photoUrl: 'http://photo.com/2',
    }));

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
