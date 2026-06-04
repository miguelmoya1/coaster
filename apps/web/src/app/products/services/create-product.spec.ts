import { TestBed } from '@angular/core/testing';
import type { CreateProductDto } from '@coaster/common';
import { asBarId, asCategoryId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { CreateProduct } from './create-product';

describe('CreateProduct', () => {
  let service: CreateProduct;
  let productRepoMock: Record<string, Mock>;

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

  describe('execute', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const dto: CreateProductDto = {
        name: 'Beer',
        categoryId: asCategoryId('cat-1'),
        minStockAlert: 5,
        price: 1050,
      };
      productRepoMock['create'].mockResolvedValue(undefined);

      const result = await service.execute(barId, dto);

      expect(productRepoMock['create']).toHaveBeenCalledWith(barId, dto);
      expect(result).toBeUndefined();
    });
  });
});
