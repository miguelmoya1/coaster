import { TestBed } from '@angular/core/testing';

import { BarRepository } from './bar-repository';

describe('BarRepository', () => {
  let service: BarRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BarRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
