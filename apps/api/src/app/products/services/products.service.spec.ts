import {
  asBarId,
  asCategoryId,
  asProductId,
  CreateProductDto,
  ProductStatus,
  SocketEvents,
  UpdateProductStatusDto,
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
      create: jest.fn(),
      updateStatus: jest.fn(),
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
      status: ProductStatus.OK,
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
        status: 'OK',
        createdAt: FAKE_DATE,
        updatedAt: FAKE_DATE,
      } as any);

      const result = await service.createProduct(asBarId('bar-1'), createDto);

      expect(repository.create).toHaveBeenCalledWith(
        'cat-1',
        'Coca Cola',
        'OK',
      );

      const expectedDomain = {
        id: asProductId('prod-1'),
        categoryId: asCategoryId('cat-1'),
        name: 'Coca Cola',
        status: ProductStatus.OK,
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

  describe('updateProductStatus', () => {
    const updateDto: UpdateProductStatusDto = {
      status: ProductStatus.OUT_OF_STOCK,
    };

    it('debería actualizar estado, mapear y emitir evento WebSocket', async () => {
      repository.updateStatus.mockResolvedValue({
        id: 'prod-1',
        categoryId: 'cat-1',
        name: 'Coca Cola',
        status: 'OUT_OF_STOCK',
        createdAt: FAKE_DATE,
        updatedAt: FAKE_DATE,
      } as any);

      const result = await service.updateProductStatus(
        asBarId('bar-1'),
        asProductId('prod-1'),
        updateDto,
      );

      expect(repository.updateStatus).toHaveBeenCalledWith(
        'prod-1',
        ProductStatus.OUT_OF_STOCK,
      );

      const expectedDomain = {
        id: asProductId('prod-1'),
        categoryId: asCategoryId('cat-1'),
        name: 'Coca Cola',
        status: ProductStatus.OUT_OF_STOCK,
        lastUpdated: FAKE_DATE.toISOString(),
      };

      expect(result).toEqual(expectedDomain);
      expect(gateway.server.to).toHaveBeenCalledWith('bar-1');
      expect(gateway.server.emit).toHaveBeenCalledWith(
        SocketEvents.PRODUCT_STATUS_CHANGED,
        expectedDomain,
      );
    });
  });
});
