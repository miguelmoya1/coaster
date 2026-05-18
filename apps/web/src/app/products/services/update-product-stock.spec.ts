import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, Product, UpdateProductStockDto } from '@coaster/common';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { UpdateProductStock } from './update-product-stock';

describe('UpdateProductStock', () => {
  let service: UpdateProductStock;
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
      updateStock: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ProductRepository, useValue: productRepoMock }],
    });

    service = TestBed.inject(UpdateProductStock);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const productId = asProductId('prod-1');
      const dto: UpdateProductStockDto = { currentStock: 15 };
      productRepoMock['updateStock'].mockResolvedValue(mockProduct);

      const result = await service.execute(barId, productId, dto);

      expect(productRepoMock['updateStock']).toHaveBeenCalledWith(barId, productId, dto);
      expect(result).toEqual(mockProduct);
    });
  });
});
