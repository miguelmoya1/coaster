import { TestBed } from '@angular/core/testing';
import { asEstablishmentId } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { EstablishmentCategories } from './establishment-categories';

describe('EstablishmentCategories', () => {
  let service: EstablishmentCategories;

  const repositoryMock = {
    routes: {
      list: vi.fn().mockReturnValue('/establishments/establishment-1/categories'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [{ provide: CategoryRepository, useValue: repositoryMock }],
    });

    service = TestBed.inject(EstablishmentCategories);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('execute', () => {
    it('should return undefined when establishmentId is undefined', () => {
      const result = service.execute(undefined);
      expect(result).toBeUndefined();
    });

    it('should call repository routes.list when establishmentId is provided', () => {
      const establishmentId = asEstablishmentId('establishment-1');
      service.execute(establishmentId);
      expect(repositoryMock.routes.list).toHaveBeenCalledWith(establishmentId);
    });

    it('should return the route URL when establishmentId is provided', () => {
      const establishmentId = asEstablishmentId('establishment-1');
      const result = service.execute(establishmentId);
      expect(result).toBe('/establishments/establishment-1/categories');
    });
  });
});
