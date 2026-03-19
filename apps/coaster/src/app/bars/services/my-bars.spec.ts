import { TestBed } from '@angular/core/testing';

import { MyBars } from './my-bars';

describe('MyBars', () => {
  let service: MyBars;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MyBars);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
