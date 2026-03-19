import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, ProductStatus } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { BarProducts } from './bar-products';
import { CreateProduct } from './create-product';

describe('CreateProduct', () => {
  let service: CreateProduct;
  let repositoryMock: Record<string, Mock>;
  let barProductsMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      create: vi.fn(),
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
    service = TestBed.inject(CreateProduct);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.create and reload state on create', async () => {
    const barId = asBarId('bar-1');
    const dto = { name: 'New Product', categoryId: asCategoryId('cat-1') };
    const expectedProduct = { id: 'prod-1', ...dto, status: ProductStatus.OK, lastUpdated: new Date().toISOString() };
    repositoryMock['create'].mockResolvedValue(expectedProduct);

    const result = await service.create(barId, dto);

    expect(repositoryMock['create']).toHaveBeenCalledWith(barId, dto);
    expect(barProductsMock['reload']).toHaveBeenCalled();
    expect(result).toEqual(expectedProduct);
  });
});
