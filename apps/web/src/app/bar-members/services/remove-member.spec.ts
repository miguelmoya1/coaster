import { TestBed } from '@angular/core/testing';
import { asBarId, asBarMemberId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { MemberRepository } from '../data-access/member-repository';
import { RemoveMember } from './remove-member';

describe('RemoveMember', () => {
  let service: RemoveMember;
  let memberRepoMock: Record<string, Mock>;

  beforeEach(() => {
    memberRepoMock = {
      remove: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MemberRepository, useValue: memberRepoMock }],
    });

    service = TestBed.inject(RemoveMember);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('remove', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const memberId = 'mem-1';
      memberRepoMock['remove'].mockResolvedValue({ success: true });

      const result = await service.execute(barId, asBarMemberId(memberId));

      expect(memberRepoMock['remove']).toHaveBeenCalledWith(barId, memberId);
      expect(result).toEqual({ success: true });
    });
  });
});
