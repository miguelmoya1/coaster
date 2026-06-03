import { asBarId, asBarMemberId, asUserId, BarRole } from '../../../core';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { BarMembersRepository } from '../../data-access/bar-members.repository';
import { GetMemberMeHandler } from './get-member-me.handler';
import { GetMemberMeQuery } from './get-member-me.query';

describe('GetMemberMeHandler', () => {
  let handler: GetMemberMeHandler;
  let repository: BarMembersRepository;

  const mockRepository = {
    getMemberByUserAndBar: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMemberMeHandler,
        {
          provide: BarMembersRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    handler = module.get<GetMemberMeHandler>(GetMemberMeHandler);
    repository = module.get<BarMembersRepository>(BarMembersRepository);
  });

  it('should return mapped member if found and active', async () => {
    const barId = asBarId('bar-1');
    const userId = asUserId('user-1');
    const mockDbMember = {
      id: 'member-1',
      userId,
      barId,
      role: 'STAFF',
      active: true,
      user: { name: 'John Doe', photoUrl: 'http://test.com/photo.jpg', email: 'john@test.com' },
    };

    mockRepository.getMemberByUserAndBar.mockResolvedValue(mockDbMember);

    const result = await handler.execute(new GetMemberMeQuery(barId, userId));

    expect(result).toEqual({
      id: asBarMemberId('member-1'),
      userId,
      barId,
      role: BarRole.STAFF,
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

    mockRepository.getMemberByUserAndBar.mockResolvedValue(null);

    await expect(handler.execute(new GetMemberMeQuery(barId, userId))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException if member is inactive', async () => {
    const barId = asBarId('bar-1');
    const userId = asUserId('user-1');
    const mockDbMember = {
      id: 'member-1',
      userId,
      barId,
      role: 'STAFF',
      active: false,
      user: { name: 'John Doe', photoUrl: 'http://test.com/photo.jpg', email: 'john@test.com' },
    };

    mockRepository.getMemberByUserAndBar.mockResolvedValue(mockDbMember);

    await expect(handler.execute(new GetMemberMeQuery(barId, userId))).rejects.toThrow(
      NotFoundException,
    );
  });
});
