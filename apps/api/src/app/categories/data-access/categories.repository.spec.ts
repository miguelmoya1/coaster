import { asBarId } from '@coaster/interfaces';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../core';
import { CategoriesRepository } from './categories.repository';

describe('CategoriesRepository', () => {
  let repository: CategoriesRepository;
  let prisma: {
    category: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    const mockPrisma = {
      category: { create: jest.fn(), findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<CategoriesRepository>(CategoriesRepository);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('debería crear una categoría con productos incluidos', async () => {
      prisma.category.create.mockResolvedValue({ id: 'cat-1', name: 'Bebidas' });

      const result = await repository.create(asBarId('bar-1'), 'Bebidas', 'beer');

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { barId: 'bar-1', name: 'Bebidas', icon: 'beer' },
        include: { products: { orderBy: { name: 'asc' } } },
      });
      expect(result).toEqual({ id: 'cat-1', name: 'Bebidas' });
    });
  });

  describe('findByBarId', () => {
    it('debería buscar categorías del bar con productos ordenados', async () => {
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1' }]);

      const result = await repository.findByBarId(asBarId('bar-1'));

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { barId: 'bar-1' },
        include: { products: { orderBy: { name: 'asc' } } },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([{ id: 'cat-1' }]);
    });
  });
});
