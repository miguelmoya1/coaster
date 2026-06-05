import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId } from '../../../core';
import { UserRepository } from '../../data-access/user.repository';
import { GetUserByIdHandler } from './get-user-by-id.handler';
import { GetUserByIdQuery } from './get-user-by-id.query';

describe('GetUserByIdHandler', () => {
  let handler: GetUserByIdHandler;
  const repository = {
    findById: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetUserByIdHandler, { provide: UserRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetUserByIdHandler>(GetUserByIdHandler);
  });

  it('should return null if the user does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const result = await handler.execute(new GetUserByIdQuery(asUserId('no-exist')));

    expect(repository.findById).toHaveBeenCalledWith('no-exist');
    expect(result).toBeNull();
  });

  it('should map db user to domain correctly', async () => {
    repository.findById.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new GetUserByIdQuery(asUserId('user-1')));

    expect(result).toEqual({
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
    });
  });
});
