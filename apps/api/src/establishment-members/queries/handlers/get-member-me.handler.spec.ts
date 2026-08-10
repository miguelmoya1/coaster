import { EstablishmentRole, asEstablishmentId, asEstablishmentMemberId, asUserId } from '@coaster/common';
import { DbEstablishmentRole } from '@coaster/core/db';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EstablishmentMembersReadRepository } from '../../data-access/establishment-members.read.repository';
import { GetMemberMeQuery } from '../impl/get-member-me.query';
import { GetMemberMeHandler } from './get-member-me.handler';

describe('GetMemberMeHandler', () => {
  let handler: GetMemberMeHandler;
  let repository: EstablishmentMembersReadRepository;

  const mockReadRepository = {
    getMemberByUserAndEstablishment: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMemberMeHandler,
        {
          provide: EstablishmentMembersReadRepository,
          useValue: mockReadRepository,
        },
      ],
    }).compile();

    handler = module.get<GetMemberMeHandler>(GetMemberMeHandler);
    repository = module.get<EstablishmentMembersReadRepository>(EstablishmentMembersReadRepository);
  });

  it('should return mapped member if found and active', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const userId = asUserId('user-1');
    const mockDbMember = {
      id: 'member-1',
      userId,
      establishmentId,
      role: EstablishmentRole.STAFF,
      active: true,
      user: { name: 'John Doe', photoUrl: 'http://test.com/photo.jpg', email: 'john@test.com' },
    };

    mockReadRepository.getMemberByUserAndEstablishment.mockResolvedValue(mockDbMember);

    const user = { id: userId, name: 'John Doe', email: 'john@test.com', active: true, role: 'USER' as const };
    const result = await handler.execute(new GetMemberMeQuery(establishmentId, user as any));

    expect(result).toEqual({
      id: asEstablishmentMemberId('member-1'),
      userId,
      establishmentId,
      role: DbEstablishmentRole.STAFF,
      permissions: expect.any(Array),
      active: true,
      userName: 'John Doe',
      userImage: 'http://test.com/photo.jpg',
      userEmail: 'john@test.com',
    });
    expect(repository.getMemberByUserAndEstablishment).toHaveBeenCalledWith(userId, establishmentId);
  });

  it('should throw NotFoundException if member not found', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const userId = asUserId('user-1');

    mockReadRepository.getMemberByUserAndEstablishment.mockResolvedValue(null);

    const user = { id: userId, name: 'John Doe', email: 'john@test.com', active: true, role: 'USER' as const };
    await expect(handler.execute(new GetMemberMeQuery(establishmentId, user as any))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException if member is inactive', async () => {
    const establishmentId = asEstablishmentId('establishment-1');
    const userId = asUserId('user-1');
    const mockDbMember = {
      id: 'member-1',
      userId,
      establishmentId,
      role: EstablishmentRole.STAFF,
      active: false,
      user: { name: 'John Doe', photoUrl: 'http://test.com/photo.jpg', email: 'john@test.com' },
    };

    mockReadRepository.getMemberByUserAndEstablishment.mockResolvedValue(mockDbMember);

    const user = { id: userId, name: 'John Doe', email: 'john@test.com', active: true, role: 'USER' as const };
    await expect(handler.execute(new GetMemberMeQuery(establishmentId, user as any))).rejects.toThrow(
      NotFoundException,
    );
  });
});
