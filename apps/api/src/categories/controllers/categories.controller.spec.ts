import { asBarId } from '@coaster/common';
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

  it('getCategories should delegate to the service', () => {
    service.getCategories.mockResolvedValue([]);

    controller.getCategories(asBarId('bar-1'));

    expect(service.getCategories).toHaveBeenCalledWith('bar-1');
  });

  it('createCategory should delegate to the service', () => {
    service.createCategory.mockResolvedValue({});
    const dto = { name: 'Bebidas', icon: 'beer' };

    controller.createCategory(asBarId('bar-1'), dto);

    expect(service.createCategory).toHaveBeenCalledWith('bar-1', { name: 'Bebidas', icon: 'beer' });
  });
});
