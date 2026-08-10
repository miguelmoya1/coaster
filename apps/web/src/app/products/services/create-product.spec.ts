import { asEstablishmentId, asCategoryId } from '@coaster/common';
import { TestBed } from '@angular/core/testing';
import type { CreateProductDto } from '@coaster/common';
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
      const establishmentId = asEstablishmentId('establishment-1');
      const dto: CreateProductDto = {
        name: 'Beer',
        categoryId: asCategoryId('cat-1'),
        minStockAlert: 5,
        price: 1050,
      };
      productRepoMock['create'].mockResolvedValue(undefined);

      const result = await service.execute(establishmentId, dto);

      expect(productRepoMock['create']).toHaveBeenCalledWith(establishmentId, dto);
      expect(result).toBeUndefined();
    });
  });
});
