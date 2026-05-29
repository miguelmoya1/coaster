import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemberRepository } from '../../members/data-access/member-repository';
import { MyMember } from './my-member';

describe('MyMember', () => {
  let service: MyMember;
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      me: vi.fn().mockReturnValue('/bars/bar-1/members/me'),
    },
  };

  beforeEach(() => {
    isAuthenticated.set(true);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Auth, useValue: authMock },
        { provide: MemberRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(MyMember);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return the me route when authenticated and id provided', () => {
      const barId = asBarId('bar-1');
      const result = service.execute(barId);

      expect(repositoryMock.routes.me).toHaveBeenCalledWith(barId);
      expect(result).toBe('/bars/bar-1/members/me');
    });

    it('should return undefined when not authenticated', () => {
      isAuthenticated.set(false);
      expect(service.execute(asBarId('bar-1'))).toBeUndefined();
    });

    it('should return undefined when id is undefined', () => {
      expect(service.execute(undefined)).toBeUndefined();
    });
  });
});
