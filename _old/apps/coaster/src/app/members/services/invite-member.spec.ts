import { Mock, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId, asUserId, BarMember, BarRole } from '@coaster/interfaces';
import { MemberRepository } from '../data-access/member-repository';
import { InviteMember } from './invite-member';

describe('InviteMember', () => {
  let service: InviteMember;
  let memberRepoMock: Record<string, Mock>;

  const mockMember: BarMember = {
    id: asBarMemberId('member-1'),
    userId: asUserId('user-1'),
    barId: asBarId('bar-1'),
    role: BarRole.STAFF,
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
      const barId = asBarId('bar-1');
      const dto = { email: 'john@test.com', role: BarRole.STAFF };
      memberRepoMock['invite'].mockResolvedValue(mockMember);

      const result = await service.invite(barId, dto);

      expect(memberRepoMock['invite']).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockMember);
    });
  });
});
