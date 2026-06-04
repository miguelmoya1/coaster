import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { UpdateCategory } from './update-category';

describe('UpdateCategory', () => {
  let service: UpdateCategory;
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

    service = TestBed.inject(UpdateCategory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute function', () => {
    it('should call repository.update on execute', async () => {
      const barId = asBarId('bar-1');
      const categoryId = asCategoryId('cat-1');
      const dto = { name: 'Updated Category' };

      await service.execute(barId, categoryId, dto);

      expect(repositoryMock.update).toHaveBeenCalledWith(barId, categoryId, dto);
    });

    it('should return void', async () => {
      const barId = asBarId('bar-1');
      const categoryId = asCategoryId('cat-1');
      const dto = { name: 'Updated Category' };
      repositoryMock.update.mockResolvedValue(undefined);

      const result = await service.execute(barId, categoryId, dto);

      expect(result).toBeUndefined();
    });
  });
});
