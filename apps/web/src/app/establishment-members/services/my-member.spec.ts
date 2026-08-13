import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MemberRepository } from '@coaster/establishment-members';
import { asEstablishmentId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MyMember } from './my-member';

describe('MyMember', () => {
  let service: MyMember;
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      me: vi.fn().mockReturnValue('/establishments/establishment-1/members/me'),
    },
  };

  beforeEach(() => {
    isAuthLoaded.set(true);
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
      const establishmentId = asEstablishmentId('establishment-1');
      const result = service.execute(establishmentId);

      expect(repositoryMock.routes.me).toHaveBeenCalledWith(establishmentId);
      expect(result).toBe('/establishments/establishment-1/members/me');
    });

    it('should return undefined when not authenticated', () => {
      isAuthenticated.set(false);
      expect(service.execute(asEstablishmentId('establishment-1'))).toBeUndefined();
    });

    it('should return undefined when auth is not loaded', () => {
      isAuthLoaded.set(false);
      expect(service.execute(asEstablishmentId('establishment-1'))).toBeUndefined();
    });

    it('should return undefined when id is undefined', () => {
      expect(service.execute(undefined)).toBeUndefined();
    });
  });
});
