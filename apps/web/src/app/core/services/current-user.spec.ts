import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { User } from '@coaster/common';
import { asUserId, Role } from '@coaster/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { Auth, UserProfile } from './auth';
import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  let service: CurrentUser;
  let httpMock: HttpTestingController;

  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);
  const userProfile = signal<UserProfile | null>(null);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
    userProfile: userProfile.asReadonly(),
  };

  beforeEach(async () => {
    isAuthLoaded.set(true);
    isAuthenticated.set(true);
    userProfile.set(null);

    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting(), { provide: Auth, useValue: authMock }],
    });

    service = TestBed.inject(CurrentUser);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('current', () => {
    it('should be loading at start when authenticated and loaded', () => {
      expect(service.current.status()).toBe('loading');
      expect(service.current.hasValue()).toBe(false);
      expect(service.current.isLoading()).toBe(true);
    });

    it('should be idle if auth is not loaded', () => {
      isAuthLoaded.set(false);
      TestBed.tick();

      service = TestBed.inject(CurrentUser);
      expect(service.current.status()).toBe('idle');
    });

    it('should be idle if not authenticated', () => {
      isAuthenticated.set(false);
      TestBed.tick();

      service = TestBed.inject(CurrentUser);
      expect(service.current.status()).toBe('idle');
    });

    it('should fetch current user when authenticated', async () => {
      TestBed.tick();

      const mockUser: User = {
        id: asUserId('user-1'),
        email: 'test@example.com',
        name: 'Test user',
        active: true,
        role: Role.USER,
      };

      httpMock.expectOne('/users/me').flush(mockUser);

      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.current.hasValue()).toBe(true);

      const currentUser = service.current.value();
      expect(currentUser).toBeDefined();
      expect(currentUser?.id).toBe(mockUser.id);
      expect(currentUser?.email).toBe(mockUser.email);
      expect(currentUser?.name).toBe(mockUser.name);
      expect(currentUser?.photoUrl).toContain('ui-avatars.com');
    });
  });

  describe('syncUser', () => {
    const mockUser: User = {
      id: asUserId('user-1'),
      email: 'test@example.com',
      name: 'Test user',
      active: true,
      role: Role.USER,
      photoUrl: 'http://photo.com/1',
    };

    it('should not update if user matches profile', async () => {
      userProfile.set({
        name: 'Test user',
        email: 'test@example.com',
        photo: 'http://photo.com/1',
      });

      const result = await service.syncUser(mockUser);

      expect(result).toEqual(mockUser);
      httpMock.expectNone('/users/me');
    });

    it('should update if name differs from profile', async () => {
      userProfile.set({
        name: 'Old Name',
        email: 'test@example.com',
        photo: 'http://photo.com/1',
      });

      const promise = service.syncUser(mockUser);

      const req = httpMock.expectOne('/users/me');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);

      const result = await promise;
      expect(result).toEqual(mockUser);
    });

    it('should update if photo differs from profile', async () => {
      userProfile.set({
        name: 'Test user',
        email: 'test@example.com',
        photo: 'http://old.photo/1',
      });

      const promise = service.syncUser(mockUser);

      const req = httpMock.expectOne('/users/me');
      expect(req.request.method).toBe('PATCH');
      req.flush(null);

      await promise;
    });

    it('should not update if no profile available', async () => {
      userProfile.set(null);

      const result = await service.syncUser(mockUser);

      expect(result).toEqual(mockUser);
      httpMock.expectNone('/users/me');
    });
  });
});
