import { TestBed } from '@angular/core/testing';

import { ShiftsStore } from './shifts.store';

describe('ShiftsStore', () => {
  let service: ShiftsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShiftsStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
