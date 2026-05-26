import { asUserId } from '@coaster/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BarRepository } from '../../data-access/bar.repository';
import { GetBarsForUserHandler } from './get-bars-for-user.handler';
import { GetBarsForUserQuery } from './get-bars-for-user.query';

describe('GetBarsForUserHandler', () => {
  let handler: GetBarsForUserHandler;
  const repository = {
    findByUserId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetBarsForUserHandler, { provide: BarRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetBarsForUserHandler>(GetBarsForUserHandler);
  });

  it('should return bars for user', async () => {
    const user = { id: asUserId('user-1'), name: 'User 1', email: 'a@a.com', active: true };
    repository.findByUserId.mockResolvedValue([]);

    const result = await handler.execute(new GetBarsForUserQuery(user));

    expect(repository.findByUserId).toHaveBeenCalledWith(user.id);
    expect(result).toEqual([]);
  });
});
