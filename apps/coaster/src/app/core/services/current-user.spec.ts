import { TestBed } from '@angular/core/testing';

import { CurrentUser } from './current-user';

describe('CurrentUser', () => {
  let service: CurrentUser;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentUser);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
