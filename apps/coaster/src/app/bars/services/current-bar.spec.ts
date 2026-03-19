import { TestBed } from '@angular/core/testing';

import { CurrentBar } from './current-bar';

describe('CurrentBar', () => {
  let service: CurrentBar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CurrentBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
