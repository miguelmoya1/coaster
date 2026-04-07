import {
  asBarId,
  asCategoryId,
  asProductId,
  CreateProductDto,
  SocketEvents,
  UpdateProductStockDto,
} from '@coaster/interfaces';
import { ErrorCodes } from '@coaster/logic';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BarGateway } from '../../core';
import { ProductsRepository } from '../data-access/products.repository';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: jest.Mocked<ProductsRepository>;
  let gateway: any;

  const FAKE_DATE = new Date('2026-01-01T10:00:00Z');

  beforeEach(async () => {
    const mockRepo = {
      checkCategoryBelongsToBar: jest.fn(),
      findByBarId: jest.fn(),
      create: jest.fn(),
      updateStock: jest.fn(),
    };
    const mockGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: mockRepo },
        { provide: BarGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(ProductsRepository);
    gateway = module.get(BarGateway);
  });

  describe('createProduct', () => {
    const createDto: CreateProductDto = {
      name: 'Coca Cola',
      categoryId: asCategoryId('cat-1'),
      currentStock: 10,
      minStockAlert: 5,
    };

    it('debería bloquear creación si la categoría no es del bar', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(false);

      await expect(
        service.createProduct(asBarId('bar-1'), createDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createProduct(asBarId('bar-1'), createDto),
      ).rejects.toThrow(ErrorCodes.CATEGORY_NOT_FOUND);

      expect(repository.create).not.toHaveBeenCalled();
      expect(gateway.server.emit).not.toHaveBeenCalled();
    });

    it('debería crear el producto y emitir el evento WebSocket', async () => {
      repository.checkCategoryBelongsToBar.mockResolvedValue(true);
      repository.create.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Coca Cola',
        currentStock: 10,
        minStockAlert: 5,
        createdAt: FAKE_DATE,
        updatedAt: FAKE_DATE,
      } as any);

      const result = await service.createProduct(asBarId('bar-1'), createDto);

      expect(repository.create).toHaveBeenCalledWith(
        'cat-1',
        { categoryId: 'cat-1', name: 'Coca Cola', currentStock: 10, minStockAlert: 5 },
      );

      const expectedDomain = {
        id: asProductId('prod-1'),
        categoryId: asCategoryId('cat-1'),
        name: 'Coca Cola',
        currentStock: 10,
        minStockAlert: 5,
        lastUpdated: FAKE_DATE.toISOString(),
      };

      expect(result).toEqual(expectedDomain);
      expect(gateway.server.to).toHaveBeenCalledWith('bar-1');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        SocketEvents.PRODUCT_CREATED,
        expectedDomain,
      );
    });
  });

  describe('updateProductStock', () => {
    const updateDto: UpdateProductStockDto = {
      currentStock: 2,
      minStockAlert: 5,
    };

    it('debería actualizar estado, mapear y emitir evento WebSocket', async () => {
      repository.updateStock.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Coca Cola',
        currentStock: 2,
        minStockAlert: 5,
        createdAt: FAKE_DATE,
        updatedAt: FAKE_DATE,
      } as any);

      const result = await service.updateProductStock(
        asBarId('bar-1'),
        asProductId('prod-1'),
        updateDto,
      );

      expect(repository.updateStock).toHaveBeenCalledWith(
        'prod-1',
        { currentStock: 2, minStockAlert: 5 },
      );

      const expectedDomain = {
        id: asProductId('prod-1'),
        categoryId: asCategoryId('cat-1'),
        name: 'Coca Cola',
        currentStock: 2,
        minStockAlert: 5,
        lastUpdated: FAKE_DATE.toISOString(),
      };

      expect(result).toEqual(expectedDomain);
      expect(gateway.server.to).toHaveBeenCalledWith('bar-1');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        SocketEvents.PRODUCT_STOCK_CHANGED,
        expectedDomain,
      );
    });
  });

  describe('getProductsByBarId', () => {
    it('debería devolver y mapear los productos del bar', async () => {
      repository.findByBarId.mockResolvedValue([
        {
          id: 'prod-1',
          categoryId: 'cat-1',
          name: 'Coca Cola',
          currentStock: 10,
          minStockAlert: 5,
          createdAt: FAKE_DATE,
          updatedAt: FAKE_DATE,
        } as any,
      ]);

      const result = await service.getProductsByBarId(asBarId('bar-1'));

      expect(repository.findByBarId).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual([
        {
          id: asProductId('prod-1'),
          categoryId: asCategoryId('cat-1'),
          name: 'Coca Cola',
          currentStock: 10,
          minStockAlert: 5,
          lastUpdated: FAKE_DATE.toISOString(),
        },
      ]);
    });
  });
});
