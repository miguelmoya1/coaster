import { TestBed } from '@angular/core/testing';

import { CreateBar } from './create-bar';

describe('CreateBar', () => {
  let service: CreateBar;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CreateBar);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
