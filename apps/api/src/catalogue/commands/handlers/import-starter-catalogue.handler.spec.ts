import { asEstablishmentId } from '@coaster/common';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueRepository } from '../../data-access/catalogue.repository';
import { ImportStarterCatalogueCommand } from '../impl/import-starter-catalogue.command';
import { ImportStarterCatalogueHandler } from './import-starter-catalogue.handler';

describe('ImportStarterCatalogueHandler', () => {
  let handler: ImportStarterCatalogueHandler;

  const repository = {
    languageOf: vi.fn(),
    findCategoriesByName: vi.fn(),
    findProductNames: vi.fn(),
    createCategories: vi.fn(),
    createProducts: vi.fn(),
  };

  const establishmentId = asEstablishmentId('establishment-1');
  const importing = (...categoryKeys: string[]) =>
    handler.execute(new ImportStarterCatalogueCommand(establishmentId, { categoryKeys }));

  beforeEach(async () => {
    vi.clearAllMocks();
    repository.languageOf.mockResolvedValue('es');
    repository.findCategoriesByName.mockResolvedValue([]);
    repository.findProductNames.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportStarterCatalogueHandler, { provide: CatalogueRepository, useValue: repository }],
    }).compile();

    handler = module.get(ImportStarterCatalogueHandler);
  });

  it('should create the category and its products as words', async () => {
    repository.findCategoriesByName
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Cafetería' }]);

    await importing('cafeteria');

    expect(repository.createCategories).toHaveBeenCalledWith([{ establishmentId, name: 'Cafetería', icon: 'coffee' }]);
    expect(repository.createProducts).toHaveBeenCalledWith(
      expect.arrayContaining([{ categoryId: 'cat-1', name: 'Café Solo', price: 120 }]),
    );
  });

  it('should write the establishment language, not Spanish by default', async () => {
    repository.languageOf.mockResolvedValue('en');
    repository.findCategoriesByName
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Coffee Shop' }]);

    await importing('cafeteria');

    expect(repository.createCategories).toHaveBeenCalledWith([
      { establishmentId, name: 'Coffee Shop', icon: 'coffee' },
    ]);
    expect(repository.createProducts).toHaveBeenCalledWith(
      expect.arrayContaining([{ categoryId: 'cat-1', name: 'Black Coffee', price: 120 }]),
    );
  });

  it('should not create a category the establishment already has', async () => {
    repository.findCategoriesByName.mockResolvedValue([{ id: 'cat-1', name: 'Cafetería' }]);

    await importing('cafeteria');

    expect(repository.createCategories).not.toHaveBeenCalled();
    expect(repository.createProducts).toHaveBeenCalled();
  });

  it('should skip a product already sitting in that category', async () => {
    repository.findCategoriesByName.mockResolvedValue([{ id: 'cat-1', name: 'Cafetería' }]);
    repository.findProductNames.mockResolvedValue([{ categoryId: 'cat-1', name: 'Café Solo' }]);

    await importing('cafeteria');

    const [created] = repository.createProducts.mock.calls[0] as [{ name: string }[]];

    expect(created.map((product) => product.name)).not.toContain('Café Solo');
    expect(created.length).toBeGreaterThan(0);
  });

  it('should write nothing at all when everything is already there', async () => {
    repository.findCategoriesByName.mockResolvedValue([{ id: 'cat-1', name: 'Cafetería' }]);
    repository.findProductNames.mockResolvedValue(
      [
        'Café Solo',
        'Café Espresso',
        'Café Cortado',
        'Infusión / Té',
        'Café con Leche',
        'Colacao',
        'Capuccino',
        'Carajillo',
      ].map((name) => ({ categoryId: 'cat-1', name })),
    );

    await importing('cafeteria');

    expect(repository.createCategories).not.toHaveBeenCalled();
    expect(repository.createProducts).not.toHaveBeenCalled();
  });

  it('should take an empty selection as the whole catalogue, which is what onboarding asks for', async () => {
    repository.findCategoriesByName.mockImplementation((_establishmentId: string, names: string[]) =>
      Promise.resolve(names.map((name, index) => ({ id: `cat-${index}`, name }))),
    );

    await importing();

    const [created] = repository.createProducts.mock.calls[0] as [{ name: string }[]];

    expect(created).toHaveLength(76);
  });

  it('should refuse a request naming nothing the catalogue has', async () => {
    await expect(importing('sushi')).rejects.toThrow(BadRequestException);
    expect(repository.createCategories).not.toHaveBeenCalled();
  });
});
