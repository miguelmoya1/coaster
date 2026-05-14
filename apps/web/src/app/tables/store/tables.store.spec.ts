import { TestBed } from '@angular/core/testing';

import { TablesStore } from './tables.store';

describe('TablesStore', () => {
  let service: TablesStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TablesStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
