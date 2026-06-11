import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesRepository } from '../data-access/templates-repository';
import { GetProductTemplates } from './get-product-templates';

describe('GetProductTemplates', () => {
  let service: GetProductTemplates;

  const repositoryMock = {
    routes: {
      products: vi.fn().mockReturnValue('/templates/products'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [GetProductTemplates, { provide: TemplatesRepository, useValue: repositoryMock }],
    });

    service = TestBed.inject(GetProductTemplates);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return products route', () => {
    const route = service.execute();
    expect(route).toBe('/templates/products');
    expect(repositoryMock.routes.products).toHaveBeenCalled();
  });
});
