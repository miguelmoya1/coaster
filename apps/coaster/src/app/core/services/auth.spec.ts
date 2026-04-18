import '@angular/compiler';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseAuth, useValue: { currentUser: null, updateCurrentUser: vi.fn() } },
        { provide: Auth, useValue: { isAuthenticated: () => true, userProfile: () => null } },
      ],
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
