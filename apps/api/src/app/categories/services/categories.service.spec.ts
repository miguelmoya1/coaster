import {
  asBarId,
  asCategoryId,
  asProductId,
  asProductStatus,
} from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesRepository } from '../data-access/categories.repository';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: jest.Mocked<CategoriesRepository>;

  const FAKE_DATE = new Date('2026-01-01T10:00:00Z');

  beforeEach(async () => {
    const mockRepo = {
      create: jest.fn(),
      findByBarId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get(CategoriesRepository);
  });

  describe('createCategory', () => {
    it('debería mapear correctamente la categoría creada', async () => {
      repository.create.mockResolvedValue({
        id: 'cat-1',
        barId: 'bar-1',
        name: 'Bebidas',
        icon: 'beer',
      } as any);

      const result = await service.createCategory(
        asBarId('bar-1'),
        'Bebidas',
        'beer',
      );

      expect(repository.create).toHaveBeenCalledWith('bar-1', 'Bebidas', 'beer');
      expect(result).toEqual({
        id: asCategoryId('cat-1'),
        barId: asBarId('bar-1'),
        name: 'Bebidas',
        icon: 'beer',
      });
    });
  });

  describe('getCategoriesWithProducts', () => {
    it('debería mapear categorías y sus productos anidados', async () => {
      repository.findByBarId.mockResolvedValue([
        {
          id: 'cat-1',
          barId: 'bar-1',
          name: 'Bebidas',
          icon: 'beer',
          products: [
            {
              id: 'prod-1',
              categoryId: 'cat-1',
              name: 'Coca Cola',
              status: 'OK',
              createdAt: FAKE_DATE,
              updatedAt: FAKE_DATE,
            },
          ],
        } as any,
      ]);

      const result = await service.getCategoriesWithProducts(asBarId('bar-1'));

      expect(repository.findByBarId).toHaveBeenCalledWith('bar-1');
      expect(result).toEqual([
        {
          id: asCategoryId('cat-1'),
          barId: asBarId('bar-1'),
          name: 'Bebidas',
          icon: 'beer',
          products: [
            {
              id: asProductId('prod-1'),
              categoryId: asCategoryId('cat-1'),
              name: 'Coca Cola',
              status: asProductStatus('OK'),
              lastUpdated: FAKE_DATE.toISOString(),
            },
          ],
        },
      ]);
    });

    it('debería mapear categoría sin productos como undefined', async () => {
      repository.findByBarId.mockResolvedValue([
        {
          id: 'cat-1',
          barId: 'bar-1',
          name: 'Bebidas',
          icon: null, // Test null to undefined conversion
        } as any,
      ]);

      const result = await service.getCategoriesWithProducts(asBarId('bar-1'));

      expect(result).toEqual([
        {
          id: asCategoryId('cat-1'),
          barId: asBarId('bar-1'),
          name: 'Bebidas',
          icon: undefined,
          products: undefined,
        },
      ]);
    });
  });
});
