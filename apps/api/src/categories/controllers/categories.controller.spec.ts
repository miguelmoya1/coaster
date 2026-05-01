import { asBarId, asCategoryId } from '@coaster/common';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { CategoriesService } from '../services/categories.service';
import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: Mocked<CategoriesService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getCategories: vi.fn(),
      createCategory: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
  });

  it('getCategories should delegate to the service', async () => {
    service.getCategories.mockResolvedValue([]);

    await controller.getCategories(asBarId('bar-1'));

    expect(service.getCategories).toHaveBeenCalledWith('bar-1');
  });

  it('createCategory should delegate to the service', async () => {
    service.createCategory.mockResolvedValue({
      id: asCategoryId('cat-1'),
      barId: asBarId('bar-1'),
      name: 'Bebidas',
      icon: 'beer',
    });
    const dto = { name: 'Bebidas', icon: 'beer' };

    await controller.createCategory(asBarId('bar-1'), dto);

    expect(service.createCategory).toHaveBeenCalledWith('bar-1', { name: 'Bebidas', icon: 'beer' });
  });
});
