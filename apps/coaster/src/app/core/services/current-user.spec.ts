import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { Auth } from './auth';
import { TestBed } from '@angular/core/testing';

import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  let service: CurrentUser;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: FirebaseAuth, useValue: { currentUser: null, updateCurrentUser: () => {} } },
        { provide: Auth, useValue: { isAuthenticated: () => true, userProfile: () => null } },
      ],
    });
    service = TestBed.inject(CurrentUser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
