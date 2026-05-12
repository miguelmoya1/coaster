import { TestBed } from '@angular/core/testing';

import { MembersStore } from './members.store';

describe('MembersStore', () => {
  let service: MembersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MembersStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
