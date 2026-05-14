import { TestBed } from '@angular/core/testing';

import { ProductsStore } from './products.store';

describe('ProductsStore', () => {
  let service: ProductsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProductsStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
