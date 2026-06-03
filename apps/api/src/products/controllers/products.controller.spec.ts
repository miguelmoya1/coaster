import type { CreateProductDto } from '@coaster/common';
import { asBarId, asProductId } from '../../core';
import { CanActivate } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, PermissionsGuard } from '../../core';
import {
  CreateProductCommand,
  UpdateProductStockCommand,
  UpdateProductCommand,
  DeleteProductCommand,
} from '../commands';
import { ProductsController } from './products.controller';
import { GetProductsByBarIdQuery } from '../queries';

describe('ProductsController', () => {
  let controller: ProductsController;
  let commandBus: Mocked<CommandBus>;
  let queryBus: Mocked<QueryBus>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockCommandBus = { execute: vi.fn() };
    const mockQueryBus = { execute: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: QueryBus, useValue: mockQueryBus },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ProductsController>(ProductsController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('getProducts should delegate to the query bus', async () => {
    queryBus.execute.mockResolvedValue([]);

    await controller.getProducts(asBarId('bar-1'));

    expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetProductsByBarIdQuery));
  });

  it('createProduct should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue({ id: 'prod-1' });
    const dto = { categoryId: 'cat-1', name: 'Refresco', price: 2 };

    await controller.createProduct(asBarId('bar-1'), dto as unknown as CreateProductDto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(CreateProductCommand));
  });

  it('updateStock should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { currentStock: 10 };

    await controller.updateStock(asBarId('bar-1'), asProductId('prod-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateProductStockCommand));
  });

  it('updateProduct should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);
    const dto = { name: 'Refresco VIP' };

    await controller.updateProduct(asBarId('bar-1'), asProductId('prod-1'), dto);

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(UpdateProductCommand));
  });

  it('deleteProduct should delegate to the command bus', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    await controller.deleteProduct(asBarId('bar-1'), asProductId('prod-1'));

    expect(commandBus.execute).toHaveBeenCalledWith(expect.any(DeleteProductCommand));
  });
});
