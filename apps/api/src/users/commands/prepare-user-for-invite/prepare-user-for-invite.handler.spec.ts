import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, vi } from 'vitest';
import { UserRepository } from '../../data-access/user.repository';
import { UpsertUserHandler } from './prepare-user-for-invite.handler';

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
});
