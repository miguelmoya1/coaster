import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asUserId } from '../../../core';
import { DbRole } from '../../../core/db';
import { UserReadRepository } from '../../data-access/user.read.repository';
import { GetUserByEmailHandler } from './get-user-by-email.handler';
import { GetUserByEmailQuery } from '../impl/get-user-by-email.query';

describe('GetUserByEmailHandler', () => {
  let handler: GetUserByEmailHandler;
  const repository = {
    findByEmail: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetUserByEmailHandler, { provide: UserReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetUserByEmailHandler>(GetUserByEmailHandler);
  });

  it('should return null if the user does not exist', async () => {
    repository.findByEmail.mockResolvedValue(null);

    const result = await handler.execute(new GetUserByEmailQuery('no-exist@mail.com'));

    expect(repository.findByEmail).toHaveBeenCalledWith('no-exist@mail.com');
    expect(result).toBeNull();
  });

  it('should map db user to domain correctly', async () => {
    repository.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await handler.execute(new GetUserByEmailQuery('test@mail.com'));

    expect(result).toEqual({
      id: asUserId('user-1'),
      email: 'test@mail.com',
      name: 'Test',
      googleId: 'g-123',
      photoUrl: 'http://photo.com/1',
      active: true,
      role: DbRole.USER,
    });
  });
});
