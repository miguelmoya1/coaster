import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId } from '@coaster/core';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { DeleteCategory } from './delete-category';

describe('DeleteCategory', () => {
  let service: DeleteCategory;
  let categoryRepoMock: Record<string, Mock>;

  beforeEach(() => {
    categoryRepoMock = {
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: CategoryRepository, useValue: categoryRepoMock }],
    });

    service = TestBed.inject(DeleteCategory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('delete', () => {
    it('should delegate to repository and return the result', async () => {
      const barId = asBarId('bar-1');
      const categoryId = asCategoryId('cat-1');
      categoryRepoMock['delete'].mockResolvedValue({ success: true });

      const result = await service.execute(barId, categoryId);

      expect(categoryRepoMock['delete']).toHaveBeenCalledWith(barId, categoryId);
      expect(result).toEqual({ success: true });
    });
  });
});
