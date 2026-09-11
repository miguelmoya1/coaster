import { asUserId } from '@coaster/common';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { User } from '@coaster/common';
import { Role } from '@coaster/common';
import { provideTranslateService } from '@ngx-translate/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { Auth } from './auth';
import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  let service: CurrentUser;
  let httpMock: HttpTestingController;

  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  beforeEach(async () => {
    isAuthLoaded.set(true);
    isAuthenticated.set(true);

    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting(), provideTranslateService(), { provide: Auth, useValue: authMock }],
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
        language: 'es',
        emailVerified: true,
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
});
