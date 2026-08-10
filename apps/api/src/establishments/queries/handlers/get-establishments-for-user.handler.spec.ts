import { asUserId } from '@coaster/common';
import { DbRole } from '@coaster/core/db';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentReadRepository } from '../../data-access/establishment.read.repository';
import { GetEstablishmentsForUserQuery } from '../impl/get-establishments-for-user.query';
import { GetEstablishmentsForUserHandler } from './get-establishments-for-user.handler';

describe('GetEstablishmentsForUserHandler', () => {
  let handler: GetEstablishmentsForUserHandler;
  const repository = {
    findByUserId: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetEstablishmentsForUserHandler, { provide: EstablishmentReadRepository, useValue: repository }],
    }).compile();

    handler = module.get<GetEstablishmentsForUserHandler>(GetEstablishmentsForUserHandler);
  });

  it('should return establishments for user', async () => {
    const user = {
      id: asUserId('user-1'),
      name: 'User 1',
      email: 'a@a.com',
      active: true,
      role: DbRole.USER,
      language: 'es',
    };
    repository.findByUserId.mockResolvedValue([]);

    const result = await handler.execute(new GetEstablishmentsForUserQuery(user));

    expect(repository.findByUserId).toHaveBeenCalledWith(user.id);
    expect(result).toEqual([]);
  });
});
