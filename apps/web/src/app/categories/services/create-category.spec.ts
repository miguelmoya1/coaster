import { TestBed } from '@angular/core/testing';
import { asEstablishmentId } from '@coaster/common';
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
      const establishmentId = asEstablishmentId('establishment-1');
      const dto = { name: 'New Category' };

      await service.execute(establishmentId, dto);

      expect(repositoryMock.create).toHaveBeenCalledWith(establishmentId, dto);
    });

    it('should return void', async () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const dto = { name: 'New Category' };
      repositoryMock.create.mockResolvedValue(undefined);

      const result = await service.execute(establishmentId, dto);

      expect(result).toBeUndefined();
    });
  });
});
