import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('execute function', () => {
    it('should call repository.create on execute', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'New Category' };

      await service.execute(barId, dto);

      expect(repositoryMock.create).toHaveBeenCalledWith(barId, dto);
    });

    it('should return void', async () => {
      const barId = asBarId('bar-1');
      const dto = { name: 'New Category' };
      repositoryMock.create.mockResolvedValue(undefined);

      const result = await service.execute(barId, dto);

      expect(result).toBeUndefined();
    });
  });
});
