import {
  asBarId,
  asCategoryId,
  asProductId,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductStockDto,
} from '@coaster/interfaces';
import { ErrorCodes, SocketEvents } from '@coaster/logic';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarGateway } from '../../core';
import { ProductsRepository } from '../data-access/products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository = {
    checkCategoryBelongsToBar: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findByBarId: vi.fn(),
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
        ProductsService,
        { provide: ProductsRepository, useValue: repository },
        { provide: BarGateway, useValue: barGateway },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(ProductsRepository);
  });

  describe('createProduct', () => {
    const barId = asBarId('bar-1');
    const dto: CreateProductDto = {
      categoryId: asCategoryId('cat-1'),
      name: 'Product 1',
      currentStock: 10,
      minStockAlert: 5,
    };

    it('debería fallar si la categoría no pertenece al bar', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(false);

      await expect(service.createProduct(barId, dto)).rejects.toThrow(ForbiddenException);
      await expect(service.createProduct(barId, dto)).rejects.toThrow(ErrorCodes.CATEGORY_NOT_FOUND);
    });

    it('debería crear el producto y emitir evento de socket si es correcto', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(true);
      const dbProduct = {
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Product 1',
        currentStock: 10,
        minStockAlert: 5,
        updatedAt: new Date('2026-04-21T08:00:00Z'),
      };
      repository.create.mockResolvedValue(dbProduct);

      const result = await service.createProduct(barId, dto);

      expect(repository.create).toHaveBeenCalledWith(asCategoryId('cat-1'), {
        name: 'Product 1',
        currentStock: 10,
        minStockAlert: 5,
      });
      expect(barGateway.server.to).toHaveBeenCalledWith(barId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_CREATED, result);
      expect(result).toEqual({
        id: asProductId('prod-1'),
        categoryId: asCategoryId('cat-1'),
        name: 'Product 1',
        currentStock: 10,
        minStockAlert: 5,
        lastUpdated: dbProduct.updatedAt.toISOString(),
      });
    });
  });

  describe('updateProductStock', () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto: UpdateProductStockDto = { currentStock: 20 };

    it('debería actualizar el stock y emitir evento', async () => {
      const dbProduct = {
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Product 1',
        currentStock: 20,
        minStockAlert: 5,
        updatedAt: new Date('2026-04-21T08:00:00Z'),
      };
      repository.update.mockResolvedValue(dbProduct);

      const result = await service.updateProductStock(barId, productId, dto);

      expect(repository.update).toHaveBeenCalledWith(productId, dto);
      expect(barGateway.server.to).toHaveBeenCalledWith(barId);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, result);
    });
  });

  describe('updateProduct', () => {
    const barId = asBarId('bar-1');
    const productId = asProductId('prod-1');
    const dto: UpdateProductDto = { name: 'New Name', categoryId: asCategoryId('cat-2') };

    it('debería validar la nueva categoría si se proporciona', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(false);

      await expect(service.updateProduct(barId, productId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('debería actualizar y emitir evento si la categoría es válida', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(true);
      const dbProduct = {
        id: 'prod-1',
        categoryId: 'cat-2',
        name: 'New Name',
        currentStock: 10,
        minStockAlert: 5,
        updatedAt: new Date('2026-04-21T08:00:00Z'),
      };
      repository.update.mockResolvedValue(dbProduct);

      const result = await service.updateProduct(barId, productId, dto);

      expect(repository.update).toHaveBeenCalledWith(productId, dto);
      expect(barGateway.server.emit).toHaveBeenCalledWith(SocketEvents.PRODUCT_STOCK_CHANGED, result);
    });
  });

  describe('getProductsByBarId', () => {
    it('debería retornar los productos mapeados', async () => {
      const barId = asBarId('bar-1');
      const dbProducts = [
        {
          id: 'prod-1',
          categoryId: 'cat-1',
          name: 'P1',
          currentStock: 5,
          minStockAlert: 2,
          updatedAt: new Date('2026-04-21T08:00:00Z'),
        },
      ];
      repository.findByBarId.mockResolvedValue(dbProducts);

      const result = await service.getProductsByBarId(barId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(asProductId('prod-1'));
      expect(result[0].lastUpdated).toBe(dbProducts[0].updatedAt.toISOString());
    });
  });
});
