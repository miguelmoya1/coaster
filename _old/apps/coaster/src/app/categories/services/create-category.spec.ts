import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, Category } from '@coaster/common';
import { vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { CreateCategory } from './create-category';

describe('CreateCategory', () => {
  let service: CreateCategory;
  const repositoryMock = {
    create: vi.fn(),
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

    service = TestBed.inject(CreateCategory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('create function', () => {
    it('should call repository.create on create', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'New Category' };

      await service.create(barId, dto);

      expect(repositoryMock.create).toHaveBeenCalledWith(barId, dto);
    });

    it('should return the created category', async () => {
      const barId = asBarId('bar-1');
      const category: Category = { id: asCategoryId('1'), barId, name: 'New Category' };
      const dto = { name: 'New Category' };
      repositoryMock.create.mockResolvedValue(category);

      const result = await service.create(barId, dto);

      expect(result).toEqual(category);
    });
  });
});
