import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId, ErrorCodes } from '../../../core';
import { UserRepository } from '../../data-access/user.repository';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserHandler } from './update-user.handler';

describe('UpdateUserHandler', () => {
  let handler: UpdateUserHandler;
  const repository = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UpdateUserHandler, { provide: UserRepository, useValue: repository }],
    }).compile();

    handler = module.get<UpdateUserHandler>(UpdateUserHandler);
  });

  it('should update the user correctly', async () => {
    repository.findById.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Updated Name',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/2',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

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

    const result = await handler.execute(
      new UpdateUserCommand(asUserId('user-1'), {
        name: 'Updated Name',
        photoUrl: 'http://photo.com/2',
      }),
    );

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

  it('should throw an error if the user does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(handler.execute(new UpdateUserCommand(asUserId('user-1'), {}))).rejects.toThrow(
      ErrorCodes.USER_NOT_FOUND,
    );
  });
});
