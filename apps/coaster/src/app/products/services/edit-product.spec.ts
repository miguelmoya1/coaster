import { TestBed } from '@angular/core/testing';
import { asBarId, asProductId } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { EditProduct } from './edit-product';

describe('EditProduct', () => {
  let service: EditProduct;
  let repositoryMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      update: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductRepository, useValue: repositoryMock },
      ],
    });
    service = TestBed.inject(EditProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.update and return its result', async () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto = { name: 'Updated Product', currentStock: 10 };
    
    const expectedResult = { id: productId, ...dto, minStockAlert: 5, lastUpdated: new Date().toISOString() };
    repositoryMock['update'].mockResolvedValue(expectedResult);

    const result = await service.edit(barId, productId, dto);

    expect(repositoryMock['update']).toHaveBeenCalledWith(barId, productId, dto);
    expect(result).toEqual(expectedResult);
  });
});
