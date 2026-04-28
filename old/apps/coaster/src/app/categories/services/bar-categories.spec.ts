import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, BarId, Category } from '@coaster/interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryRepository } from '../data-access/category-repository';
import { BarCategories } from './bar-categories';

describe('BarCategories', () => {
  let service: BarCategories;
  let httpMock: HttpTestingController;

  const repositoryMock = {
    routes: {
      list: vi.fn().mockReturnValue('/bars/bar-1/categories'),
      create: vi.fn().mockReturnValue('/bars/bar-1/categories'),
    },
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        {
          provide: CategoryRepository,
          useValue: repositoryMock,
        },
      ],
    });

    service = TestBed.inject(BarCategories);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('all', () => {
    it('should not have value at start', () => {
      expect(service.all.status()).toBe('idle');
      expect(service.all.hasValue()).toBe(false);
      expect(service.all.isLoading()).toBe(false);
    });

    it('should call the category repository when setBarContext is called', () => {
      const barId: BarId = asBarId('bar-1');

      service.setBarContext(barId);
      TestBed.tick();
      expect(repositoryMock.routes.list).toHaveBeenCalledWith(barId);
    });

    it('should be set when setBarContext is called', async () => {
      service.setBarContext(asBarId('bar-1'));

      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);

      const mockCategories: Category[] = [
        { id: asCategoryId('cat-1'), barId: asBarId('bar-1'), name: 'Tapas' },
        { id: asCategoryId('cat-2'), barId: asBarId('bar-1'), name: 'Cocktails' },
      ];

      httpMock.expectOne('/bars/bar-1/categories').flush(mockCategories);

      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.isLoading()).toBe(false);
      expect(service.all.hasValue()).toBe(true);
      expect(service.all.value()).toEqual(mockCategories);
    });

    it('should not fetch anything if barId is not set', () => {
      TestBed.tick();

      httpMock.expectNone('/bars/bar-1/categories');

      expect(service.all.isLoading()).toBe(false);
    });
  });

  describe('setBarContext', () => {
    it('should trigger loading when called with a barId', () => {
      service.setBarContext(asBarId('bar-1'));
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);
    });
  });

  describe('reload', () => {
    it('should reload the categories', async () => {
      service.setBarContext(asBarId('bar-1'));

      TestBed.tick();

      const mockCategories: Category[] = [
        { id: asCategoryId('cat-1'), barId: asBarId('bar-1'), name: 'Tapas' },
      ];

      httpMock.expectOne('/bars/bar-1/categories').flush(mockCategories);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.value()).toEqual(mockCategories);

      service.reload();
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);

      const mockCategoriesReloaded: Category[] = [
        { id: asCategoryId('cat-1'), barId: asBarId('bar-1'), name: 'Tapas' },
        { id: asCategoryId('cat-2'), barId: asBarId('bar-1'), name: 'Cocktails' },
      ];

      httpMock.expectOne('/bars/bar-1/categories').flush(mockCategoriesReloaded);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.value()).toEqual(mockCategoriesReloaded);
    });
  });
});
