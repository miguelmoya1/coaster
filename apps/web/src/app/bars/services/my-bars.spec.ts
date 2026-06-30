import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Auth } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { MyBars } from './my-bars';

describe('MyBars', () => {
  let service: MyBars;
  const isAuthLoaded = signal(true);
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthLoaded: isAuthLoaded.asReadonly(),
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const barRepositoryMock = {
    routes: {
      myBars: '/bars',
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
        { provide: BarRepository, useValue: barRepositoryMock },
      ],
    });

    service = TestBed.inject(MyBars);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return the myBars route when authenticated', () => {
      expect(service.execute()).toBe('/bars');
    });

    it('should return undefined when not authenticated', () => {
      isAuthenticated.set(false);
      expect(service.execute()).toBeUndefined();
    });

    it('should return undefined when auth is not loaded', () => {
      isAuthLoaded.set(false);
      expect(service.execute()).toBeUndefined();
    });
  });
});
