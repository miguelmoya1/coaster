import {
  asBarId,
  asCategoryId,
  asProductId,
} from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { ProductsService } from '../services/products.service';
import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getProductsByBarId: jest.fn(),
      createProduct: jest.fn(),
      updateProductStock: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get(ProductsService);
  });

  it('getProducts debería delegar al servicio', async () => {
    service.getProductsByBarId.mockResolvedValue([]);

    await controller.getProducts(asBarId('bar-1'));

    expect(service.getProductsByBarId).toHaveBeenCalledWith('bar-1');
  });

  it('createProduct debería delegar al servicio', async () => {
    service.createProduct.mockResolvedValue({} as any);
    const dto = { name: 'Coca Cola', categoryId: asCategoryId('cat-1') };

    await controller.createProduct(asBarId('bar-1'), dto);

    expect(service.createProduct).toHaveBeenCalledWith('bar-1', dto);
  });

  it('updateProductStock debería delegar al servicio', async () => {
    service.updateProductStock.mockResolvedValue({} as any);
    const dto = { currentStock: 2, minStockAlert: 5 };

    await controller.updateStock(asBarId('bar-1'), asProductId('prod-1'), dto);

    expect(service.updateProductStock).toHaveBeenCalledWith(
      'bar-1',
      'prod-1',
      dto,
    );
  });
});
