import type { Product } from '@coaster/common';
import { asBarId, asCategoryId, asProductId } from '../../../core';
import { ForbiddenException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductsRepository } from '../../data-access/products.repository';
import { ProductCreatedEvent } from '../../../events';
import { CreateProductCommand } from './create-product.command';
import { CreateProductHandler } from './create-product.handler';

describe('CreateProductHandler', () => {
  let handler: CreateProductHandler;
  const repository = {
    checkCategoryBelongsToBar: vi.fn(),
    create: vi.fn(),
  };
  const eventBus = {
    publish: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateProductHandler,
        { provide: ProductsRepository, useValue: repository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<CreateProductHandler>(CreateProductHandler);
  });

  const barId = asBarId('bar-1');
  const dto = { categoryId: asCategoryId('cat-1'), name: 'Refresco', price: 2 };

  it('should throw ForbiddenException if category does not belong to bar', async () => {
    repository.checkCategoryBelongsToBar.mockResolvedValue(false);

    const cmd = new CreateProductCommand(barId, dto);
    await expect(handler.execute(cmd)).rejects.toThrow(ForbiddenException);
  });

  it('should create product and publish event', async () => {
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
    await handler.execute(cmd);

    expect(repository.create).toHaveBeenCalledWith(asCategoryId('cat-1'), {
      name: 'Refresco',
      price: 2,
      currentStock: 0,
      minStockAlert: 0,
    });
    expect(eventBus.publish).toHaveBeenCalledWith(new ProductCreatedEvent(barId, expect.any(Object) as unknown as Product));
  });
});
