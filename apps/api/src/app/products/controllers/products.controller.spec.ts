import {
  asBarId,
  asCategoryId,
  asProductId,
  ProductStatus,
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
      createProduct: jest.fn(),
      updateProductStatus: jest.fn(),
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

  it('createProduct debería delegar al servicio', async () => {
    service.createProduct.mockResolvedValue({} as any);
    const dto = { name: 'Coca Cola', categoryId: asCategoryId('cat-1') };

    await controller.createProduct(asBarId('bar-1'), dto);

    expect(service.createProduct).toHaveBeenCalledWith('bar-1', dto);
  });

  it('updateProductStatus debería delegar al servicio', async () => {
    service.updateProductStatus.mockResolvedValue({} as any);
    const dto = { status: ProductStatus.OUT_OF_STOCK };

    await controller.updateStatus(asBarId('bar-1'), asProductId('prod-1'), dto);

    expect(service.updateProductStatus).toHaveBeenCalledWith(
      'bar-1',
      'prod-1',
      dto,
    );
  });
});
