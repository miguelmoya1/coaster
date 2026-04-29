import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, asProductId, CreateProductDto, Product } from '@coaster/common';
import { Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { CreateProduct } from './create-product';

describe('CreateProduct', () => {
  let service: CreateProduct;
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
      create: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: ProductRepository, useValue: productRepoMock }],
    });

    service = TestBed.inject(CreateProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('create', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const dto: CreateProductDto = { name: 'Beer', categoryId: asCategoryId('cat-1'), minStockAlert: 5, price: 1050 };
      productRepoMock['create'].mockResolvedValue(mockProduct);

      const result = await service.create(barId, dto);

      expect(productRepoMock['create']).toHaveBeenCalledWith(barId, dto);
      expect(result).toEqual(mockProduct);
    });
  });
});
