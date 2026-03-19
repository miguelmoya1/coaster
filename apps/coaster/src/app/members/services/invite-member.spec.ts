import { TestBed } from '@angular/core/testing';
import { asBarId, BarRole } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { MemberRepository } from '../data-access/member-repository';
import { InviteMember } from './invite-member';

describe('InviteMember', () => {
  let service: InviteMember;
  let repositoryMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      invite: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MemberRepository, useValue: repositoryMock }],
    });
    service = TestBed.inject(InviteMember);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.invite on invite', async () => {
    const dto = { email: 'test@test.com', role: BarRole.STAFF };
    const mockMember = {
      id: 'member-1',
      userId: 'user-1',
      barId: 'bar-1',
      role: BarRole.STAFF,
      active: true,
    };
    repositoryMock['invite'].mockResolvedValue(mockMember);

    const result = await service.invite(asBarId('bar-1'), dto);

    expect(repositoryMock['invite']).toHaveBeenCalledWith(
      asBarId('bar-1'),
      dto,
    );
    expect(result).toEqual(mockMember);
  });
});
