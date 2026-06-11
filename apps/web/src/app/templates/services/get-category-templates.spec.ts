import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplatesRepository } from '../data-access/templates-repository';
import { GetCategoryTemplates } from './get-category-templates';

describe('GetCategoryTemplates', () => {
  let service: GetCategoryTemplates;

  const repositoryMock = {
    routes: {
      categories: vi.fn().mockReturnValue('/templates/categories'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [GetCategoryTemplates, { provide: TemplatesRepository, useValue: repositoryMock }],
    });

    service = TestBed.inject(GetCategoryTemplates);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return categories route', () => {
    const route = service.execute();
    expect(route).toBe('/templates/categories');
    expect(repositoryMock.routes.categories).toHaveBeenCalled();
  });
});
