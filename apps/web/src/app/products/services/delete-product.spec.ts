import { TestBed } from '@angular/core/testing';
import { asBarId, asProductId } from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { DeleteProduct } from './delete-product';

describe('DeleteProduct', () => {
  let service: DeleteProduct;
  let productRepoMock: Record<string, Mock>;

  beforeEach(() => {
    productRepoMock = {
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ProductRepository, useValue: productRepoMock }],
    });

    service = TestBed.inject(DeleteProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const productId = asProductId('prod-1');
      productRepoMock['delete'].mockResolvedValue({ success: true });

      const result = await service.execute(barId, productId);

      expect(productRepoMock['delete']).toHaveBeenCalledWith(barId, productId);
      expect(result).toEqual({ success: true });
    });
  });
});
