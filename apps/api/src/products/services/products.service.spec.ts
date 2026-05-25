import { asBarId, asCategoryId, asProductId, ErrorCodes, SocketEvents } from '@coaster/common';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../core';
import { ProductsRepository } from '../data-access/products.repository';
import { GetProductsByBarIdHandler } from '../queries/get-products-by-bar-id/get-products-by-bar-id.handler';
import { GetProductsByBarIdQuery } from '../queries';
import { CreateProductHandler } from '../commands/create-product/create-product.handler';
import { CreateProductCommand } from '../commands';
import { UpdateProductStockHandler } from '../commands/update-product-stock/update-product-stock.handler';
import { UpdateProductStockCommand } from '../commands';
import { UpdateProductHandler } from '../commands/update-product/update-product.handler';
import { UpdateProductCommand } from '../commands';
import { DeleteProductHandler } from '../commands/delete-product/delete-product.handler';
import { DeleteProductCommand } from '../commands';

describe('Products CQRS Handlers', () => {
  let getProductsHandler: GetProductsByBarIdHandler;
  let createProductHandler: CreateProductHandler;
  let updateStockHandler: UpdateProductStockHandler;
  let updateProductHandler: UpdateProductHandler;
  let deleteProductHandler: DeleteProductHandler;

  let repository = {
    findByBarId: vi.fn(),
    checkCategoryBelongsToBar: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const barGateway = {
    server: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetProductsByBarIdHandler,
        CreateProductHandler,
        UpdateProductStockHandler,
        UpdateProductHandler,
        DeleteProductHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    getProductsHandler = module.get<GetProductsByBarIdHandler>(GetProductsByBarIdHandler);
    createProductHandler = module.get<CreateProductHandler>(CreateProductHandler);
    updateStockHandler = module.get<UpdateProductStockHandler>(UpdateProductStockHandler);
    updateProductHandler = module.get<UpdateProductHandler>(UpdateProductHandler);
    deleteProductHandler = module.get<DeleteProductHandler>(DeleteProductHandler);
    repository = module.get(ProductsRepository);
  });

  describe('GetProductsByBarIdHandler', () => {
    it('should return products by bar ID', async () => {
      const barId = asBarId('bar-1');
      repository.findByBarId.mockResolvedValue([]);

      const result = await getProductsHandler.execute(new GetProductsByBarIdQuery(barId));

      expect(repository.findByBarId).toHaveBeenCalledWith(barId);
      expect(result).toEqual([]);
    });
  });

  describe('CreateProductHandler', () => {
    const barId = asBarId('bar-1');
    const dto = { categoryId: 'cat-1', name: 'Refresco', price: 2 };

    it('should throw ForbiddenException if category does not belong to bar', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(false);

      const cmd = new CreateProductCommand(barId, dto);
      await expect(createProductHandler.execute(cmd)).rejects.toThrow(ForbiddenException);
    });

    it('should create product and emit socket event', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(true);
      repository.create.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Refresco',
        price: 2,
        currentStock: 0,
        minStockAlert: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cmd = new CreateProductCommand(barId, dto);
      const result = await createProductHandler.execute(cmd);

      expect(repository.create).toHaveBeenCalledWith(asCategoryId('cat-1'), {
        name: 'Refresco',
        price: 2,
        currentStock: 0,
        minStockAlert: 0,
      });
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_CREATED, expect.any(Object));
      expect(result).toEqual({ id: asProductId('prod-1') });
    });
  });

  describe('UpdateProductStockHandler', () => {
    it('should update stock and emit socket event', async () => {
      const barId = asBarId('bar-1');
      const productId = asProductId('prod-1');
      const dto = { currentStock: 10 };

      repository.update.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Refresco',
        price: 2,
        currentStock: 10,
        minStockAlert: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cmd = new UpdateProductStockCommand(barId, productId, dto);
      await updateStockHandler.execute(cmd);

      expect(repository.update).toHaveBeenCalledWith(productId, dto);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, expect.any(Object));
    });
  });

  describe('UpdateProductHandler', () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto = { categoryId: 'cat-2', name: 'Refresco Actualizado' };

    it('should throw ForbiddenException if new category does not belong to bar', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(false);

      const cmd = new UpdateProductCommand(barId, productId, dto);
      await expect(updateProductHandler.execute(cmd)).rejects.toThrow(ForbiddenException);
    });

    it('should update product and emit stock changed event', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(true);
      repository.update.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-2',
        name: 'Refresco Actualizado',
        price: 2,
        currentStock: 10,
        minStockAlert: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const cmd = new UpdateProductCommand(barId, productId, dto);
      await updateProductHandler.execute(cmd);

      expect(repository.update).toHaveBeenCalledWith(productId, dto);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, expect.any(Object));
    });
  });

  describe('DeleteProductHandler', () => {
    it('should delete product and emit socket event', async () => {
      const barId = asBarId('bar-1');
      const productId = asProductId('prod-1');

      repository.delete.mockResolvedValue(undefined);

      const cmd = new DeleteProductCommand(barId, productId);
      await deleteProductHandler.execute(cmd);

      expect(repository.delete).toHaveBeenCalledWith(productId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_DELETED, { id: productId });
    });
  });
});
