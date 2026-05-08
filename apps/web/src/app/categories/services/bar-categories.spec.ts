import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, asCategoryId, BarId, Category } from '@coaster/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentBar } from '../../bars';
import { CategoryRepository } from '../data-access/category-repository';
import { BarCategories } from './bar-categories';

describe('BarCategories', () => {
  let service: BarCategories;
  let httpMock: HttpTestingController;

  const currentId = signal<BarId | undefined>(undefined);

  const currentBarMock = {
    currentId: currentId.asReadonly(),
    setBarContext: (barId: BarId | undefined) => currentId.set(barId),
  };

  const repositoryMock = {
    routes: {
      list: vi.fn().mockReturnValue('/bars/bar-1/categories'),
      create: vi.fn().mockReturnValue('/bars/bar-1/categories'),
    },
  };

  beforeEach(async () => {
    currentId.set(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        {
          provide: CurrentBar,
          useValue: currentBarMock,
        },
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

    it('should call the category repository when bar context is set', () => {
      const barId: BarId = asBarId('bar-1');

      currentBarMock.setBarContext(barId);
      TestBed.tick();
      expect(repositoryMock.routes.list).toHaveBeenCalledWith(barId);
    });

    it('should be set when bar context is set', async () => {
      currentBarMock.setBarContext(asBarId('bar-1'));

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

  describe('bar context', () => {
    it('should trigger loading when bar context is set', () => {
      currentBarMock.setBarContext(asBarId('bar-1'));
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);
    });
  });

  describe('reload', () => {
    it('should reload the categories', async () => {
      currentBarMock.setBarContext(asBarId('bar-1'));

      TestBed.tick();

      const mockCategories: Category[] = [{ id: asCategoryId('cat-1'), barId: asBarId('bar-1'), name: 'Tapas' }];

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
