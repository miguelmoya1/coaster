import { asBarId } from '@coaster/interfaces';
import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FirebaseAuthGuard, RolesGuard } from '../../core';
import { CategoriesService } from '../services/categories.service';
import { CategoriesController } from './categories.controller';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<CategoriesService>;

  const mockGuard: CanActivate = { canActivate: () => true };

  beforeEach(async () => {
    const mockService = {
      getCategories: jest.fn(),
      createCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard).useValue(mockGuard)
      .overrideGuard(RolesGuard).useValue(mockGuard)
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get(CategoriesService);
  });

  it('getCategories debería delegar al servicio', () => {
    service.getCategories.mockResolvedValue([]);

    controller.getCategories(asBarId('bar-1'));

    expect(service.getCategories).toHaveBeenCalledWith('bar-1');
  });

  it('createCategory debería delegar al servicio', () => {
    service.createCategory.mockResolvedValue({} as any);
    const dto = { name: 'Bebidas', icon: 'beer' };

    controller.createCategory(asBarId('bar-1'), dto as any);

    expect(service.createCategory).toHaveBeenCalledWith('bar-1', { name: 'Bebidas', icon: 'beer' });
  });
});
