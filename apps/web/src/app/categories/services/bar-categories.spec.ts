import { TestBed } from '@angular/core/testing';
import { asBarId } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { BarCategories } from './bar-categories';

describe('BarCategories', () => {
  let service: BarCategories;

  const repositoryMock = {
    routes: {
      list: vi.fn().mockReturnValue('/bars/bar-1/categories'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: CategoryRepository, useValue: repositoryMock }],
    });

    service = TestBed.inject(BarCategories);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return undefined when barId is undefined', () => {
      const result = service.execute(undefined);
      expect(result).toBeUndefined();
    });

    it('should call repository routes.list when barId is provided', () => {
      const barId = asBarId('bar-1');
      service.execute(barId);
      expect(repositoryMock.routes.list).toHaveBeenCalledWith(barId);
    });

    it('should return the route URL when barId is provided', () => {
      const barId = asBarId('bar-1');
      const result = service.execute(barId);
      expect(result).toBe('/bars/bar-1/categories');
    });
  });
});
