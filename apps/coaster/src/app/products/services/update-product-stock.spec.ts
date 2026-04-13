import { TestBed } from '@angular/core/testing';
import { asBarId, asProductId } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { BarProducts } from './bar-products';
import { UpdateProduct } from './update-product-stock';

describe('UpdateProductStock', () => {
  let service: UpdateProduct;
  let repositoryMock: Record<string, Mock>;
  let barProductsMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      updateStock: vi.fn(),
    };
    barProductsMock = {
      reload: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UpdateProduct,
        { provide: ProductRepository, useValue: repositoryMock },
        { provide: BarProducts, useValue: barProductsMock },
      ],
    });
    service = TestBed.inject(UpdateProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.updateStock and return on update', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto = { currentStock: 2 };
    const expectedProduct = {
      id: productId,
      name: 'Product 1',
      currentStock: 2,
      minStockAlert: 5,
      lastUpdated: new Date().toISOString(),
      categoryId: 'cat-1',
    };
    repositoryMock['updateStock'].mockResolvedValue(expectedProduct);

    const result = await service.update(barId, productId, dto);

    expect(repositoryMock['updateStock']).toHaveBeenCalledWith(barId, productId, dto);

    expect(result).toEqual(expectedProduct);
  });
});
