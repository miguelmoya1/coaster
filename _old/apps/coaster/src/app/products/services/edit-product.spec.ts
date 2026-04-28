import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product, UpdateProductDto } from '@coaster/common';
import { Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { EditProduct } from './edit-product';

describe('EditProduct', () => {
  let service: EditProduct;
  let productRepoMock: Record<string, Mock>;

  const mockProduct: Product = {
    id: asProductId('prod-1'),
    categoryId: asCategoryId('cat-1'),
    name: 'Beer',
    price: 1050,
    currentStock: 10,
    minStockAlert: 5,
    stockStatus: 'good',
    lastUpdated: new Date().toISOString(),
  };

  beforeEach(() => {
    productRepoMock = {
      update: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ProductRepository, useValue: productRepoMock }],
    });

    service = TestBed.inject(EditProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('edit', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const productId = asProductId('prod-1');
      const dto: UpdateProductDto = {
        name: 'Beer Edited',
        categoryId: asCategoryId('cat-1'),
        minStockAlert: 10,
        price: 1050,
      };
      productRepoMock['update'].mockResolvedValue({ ...mockProduct, ...dto });

      const result = await service.edit(barId, productId, dto);

      expect(productRepoMock['update']).toHaveBeenCalledWith(barId, productId, dto);
      expect(result).toEqual({ ...mockProduct, ...dto });
    });
  });
});
