import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/interfaces';
import { Mock, vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { BarCategories } from './bar-categories';
import { CreateCategory } from './create-category';

describe('CreateCategory', () => {
  let service: CreateCategory;
  let repositoryMock: Record<string, Mock>;
  let barCategoriesMock: Record<string, Mock>;

  beforeEach(() => {
    repositoryMock = {
      create: vi.fn(),
    };
    barCategoriesMock = {
      reload: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: CategoryRepository, useValue: repositoryMock },
        { provide: BarCategories, useValue: barCategoriesMock },
      ],
    });
    service = TestBed.inject(CreateCategory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call repository.create and reload state on create', async () => {
    const barId = asBarId('bar-1');
    const dto = { name: 'New Category' };
    const expectedCategory = { id: 'cat-1', name: 'New Category' };
    repositoryMock['create'].mockResolvedValue(expectedCategory);

    const result = await service.create(barId, dto);

    expect(repositoryMock['create']).toHaveBeenCalledWith(barId, dto);
    expect(barCategoriesMock['reload']).toHaveBeenCalled();
    expect(result).toEqual(expectedCategory);
  });
});
