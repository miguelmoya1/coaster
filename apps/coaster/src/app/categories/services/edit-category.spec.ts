import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/interfaces';
import { vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { EditCategory } from './edit-category';

describe('EditCategory', () => {
  let service: EditCategory;
  const repositoryMock = {
    update: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        {
          provide: CategoryRepository,
          useValue: repositoryMock,
        },
      ],
    }).compileComponents();

    service = TestBed.inject(EditCategory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('edit function', () => {
    it('should call repository.update on edit', async () => {
      const barId = asBarId('bar-1');
      const categoryId = 'cat-1';
      const dto = { name: 'Updated Category' };

      await service.edit(barId, categoryId, dto);

      expect(repositoryMock.update).toHaveBeenCalledWith(barId, categoryId, dto);
    });

    it('should return the updated category', async () => {
      const barId = asBarId('bar-1');
      const categoryId = 'cat-1';
      const category: Category = { id: asCategoryId(categoryId), barId, name: 'Updated Category' };
      const dto = { name: 'Updated Category' };
      repositoryMock.update.mockResolvedValue(category);

      const result = await service.edit(barId, categoryId, dto);

      expect(result).toEqual(category);
    });
  });
});
