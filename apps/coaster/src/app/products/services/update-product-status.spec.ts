import { TestBed } from '@angular/core/testing';
import { asBarId, asProductId, ProductStatus } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { BarProducts } from './bar-products';
import { UpdateProductStatus } from './update-product-status';

describe('UpdateProductStatus', () => {
  let service: UpdateProductStatus;
  let repositoryMock: Record<string, Mock>;
  let barProductsMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      updateStatus: vi.fn(),
    };
    barProductsMock = {
      reload: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductRepository, useValue: repositoryMock },
        { provide: BarProducts, useValue: barProductsMock },
      ],
    });
    service = TestBed.inject(UpdateProductStatus);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.updateStatus and reload state on update', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto = { status: ProductStatus.OUT_OF_STOCK };
    const expectedProduct = { id: productId, name: 'Product 1', status: ProductStatus.OUT_OF_STOCK, lastUpdated: new Date().toISOString(), categoryId: 'cat-1' };
    repositoryMock['updateStatus'].mockResolvedValue(expectedProduct);

    const result = await service.updateStatus(barId, productId, dto);

    expect(repositoryMock['updateStatus']).toHaveBeenCalledWith(barId, productId, dto);
    
    expect(result).toEqual(expectedProduct);
  });
});
