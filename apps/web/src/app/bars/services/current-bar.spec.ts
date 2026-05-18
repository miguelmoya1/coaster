import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarRepository } from '../data-access/bar-repository';
import { CurrentBar } from './current-bar';

describe('CurrentBar', () => {
  let service: CurrentBar;
  const isAuthenticated = signal(true);

  const authMock = {
    isAuthenticated: isAuthenticated.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      bar: vi.fn().mockReturnValue('/bars/bar-1'),
    },
  };

  beforeEach(() => {
    isAuthenticated.set(true);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: Auth, useValue: authMock },
        { provide: BarRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(CurrentBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return the bar route when authenticated and id provided', () => {
      const barId = asBarId('bar-1');
      service.execute(barId);
      expect(repositoryMock.routes.bar).toHaveBeenCalledWith(barId);
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
