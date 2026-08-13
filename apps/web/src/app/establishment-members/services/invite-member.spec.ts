import { TestBed } from '@angular/core/testing';
import type { EstablishmentMember } from '@coaster/common';
import { asEstablishmentId, asEstablishmentMemberId, asUserId, EstablishmentRole } from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { MemberRepository } from '../data-access/member-repository';
import { InviteMember } from './invite-member';

describe('InviteMember', () => {
  let service: InviteMember;
  let memberRepoMock: Record<string, Mock>;

  const mockMember: EstablishmentMember = {
    id: asEstablishmentMemberId('member-1'),
    userId: asUserId('user-1'),
    establishmentId: asEstablishmentId('establishment-1'),
    role: EstablishmentRole.STAFF,
    permissions: [],
    active: true,
    userName: 'John Doe',
    userEmail: 'john@test.com',
    userImage: '',
  };

  beforeEach(() => {
    memberRepoMock = {
      invite: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MemberRepository, useValue: memberRepoMock }],
    });

    service = TestBed.inject(InviteMember);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('invite', () => {
    it('should delegate to repository and return the result', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const dto = { email: 'john@test.com', role: EstablishmentRole.STAFF };
      memberRepoMock['invite'].mockResolvedValue(mockMember);

      const result = await service.execute(establishmentId, dto);

      expect(memberRepoMock['invite']).toHaveBeenCalledWith(establishmentId, dto);
      expect(result).toEqual(mockMember);
    });
  });
});
