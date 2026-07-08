import { BarRole } from '@coaster/common';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { asBarId, asBarMemberId, asUserId } from '../../../core';
import { DbBarRole } from '../../../core/db';
import { BarMembersReadRepository } from '../../data-access/bar-members.read.repository';
import { GetMemberMeQuery } from '../impl/get-member-me.query';
import { GetMemberMeHandler } from './get-member-me.handler';

describe('GetMemberMeHandler', () => {
  let handler: GetMemberMeHandler;
  let repository: BarMembersReadRepository;

  const mockReadRepository = {
    getMemberByUserAndBar: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMemberMeHandler,
        {
          provide: BarMembersReadRepository,
          useValue: mockReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetMemberMeHandler>(GetMemberMeHandler);
    repository = module.get<BarMembersReadRepository>(BarMembersReadRepository);
  });

  it('should return mapped member if found and active', async () => {
    const barId = asBarId('bar-1');
    const userId = asUserId('user-1');
    const mockDbMember = {
      id: 'member-1',
      userId,
      barId,
      role: BarRole.STAFF,
      active: true,
      user: { name: 'John Doe', photoUrl: 'http://test.com/photo.jpg', email: 'john@test.com' },
    };

    mockReadRepository.getMemberByUserAndBar.mockResolvedValue(mockDbMember);

    const user = { id: userId, name: 'John Doe', email: 'john@test.com', active: true, role: 'USER' as const };
    const result = await handler.execute(new GetMemberMeQuery(barId, user as any));

    expect(result).toEqual({
      id: asBarMemberId('member-1'),
      userId,
      barId,
      role: DbBarRole.STAFF,
      permissions: expect.any(Array),
      active: true,
      userName: 'John Doe',
      userImage: 'http://test.com/photo.jpg',
      userEmail: 'john@test.com',
    });
    expect(repository.getMemberByUserAndBar).toHaveBeenCalledWith(userId, barId);
  });

  it('should throw NotFoundException if member not found', async () => {
    const barId = asBarId('bar-1');
    const userId = asUserId('user-1');

    mockReadRepository.getMemberByUserAndBar.mockResolvedValue(null);

    const user = { id: userId, name: 'John Doe', email: 'john@test.com', active: true, role: 'USER' as const };
    await expect(handler.execute(new GetMemberMeQuery(barId, user as any))).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if member is inactive', async () => {
    const barId = asBarId('bar-1');
    const userId = asUserId('user-1');
    const mockDbMember = {
      id: 'member-1',
      userId,
      barId,
      role: BarRole.STAFF,
      active: false,
      user: { name: 'John Doe', photoUrl: 'http://test.com/photo.jpg', email: 'john@test.com' },
    };

    mockReadRepository.getMemberByUserAndBar.mockResolvedValue(mockDbMember);

    const user = { id: userId, name: 'John Doe', email: 'john@test.com', active: true, role: 'USER' as const };
    await expect(handler.execute(new GetMemberMeQuery(barId, user as any))).rejects.toThrow(NotFoundException);
  });
});
