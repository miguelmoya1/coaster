import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asUserId } from '../../../core';
import { UserPreparedForInviteEvent } from '../../../events';
import { UserWriteRepository } from '../../data-access/user.write.repository';
import { PrepareUserForInviteCommand } from './prepare-user-for-invite.command';
import { PrepareUserForInviteHandler } from './prepare-user-for-invite.handler';

describe('PrepareUserForInviteHandler', () => {
  let handler: PrepareUserForInviteHandler;
  const repository = {
    upsert: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrepareUserForInviteHandler,
        { provide: UserWriteRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<PrepareUserForInviteHandler>(PrepareUserForInviteHandler);
  });

  it('should upsert user and publish UserPreparedForInviteEvent', async () => {
    repository.upsert.mockResolvedValue({
      id: 'user-1',
      name: 'test',
      email: 'test@example.com',
      photoUrl: null,
      googleId: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await handler.execute(
      new PrepareUserForInviteCommand('test@example.com', {
        barId: asBarId('bar-1'),
        role: 'STAFF',
      }),
    );

    expect(repository.upsert).toHaveBeenCalledWith('test@example.com', {
      name: 'test',
      email: 'test@example.com',
    });
    expect(eventBus.publish).toHaveBeenCalledWith(
      new UserPreparedForInviteEvent(asUserId('user-1'), asBarId('bar-1'), 'STAFF'),
    );
  });
});
