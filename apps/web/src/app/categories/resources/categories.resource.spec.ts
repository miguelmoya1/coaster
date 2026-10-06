import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asCategoryId, type Category } from '../models/category.interface';
import { asEstablishmentId, Realtime, type EstablishmentId } from '@coaster/core';
import { fakeRealtime } from '@coaster/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoriesResource } from './categories.resource';

const establishmentId = asEstablishmentId('establishment-1');
const url = `/establishments/${establishmentId}/categories`;

const category = (id: string, name = `Categoría ${id}`) =>
  ({ id: asCategoryId(id), establishmentId, name }) as Category;

describe('categoriesResource', () => {
  const realtime = {
    categoryCreated: signal<Category | null>(null),
    categoryUpdated: signal<Category | null>(null),
    categoryDeleted: signal<{ id: string } | null>(null),
    catalogueImported: signal<{ establishmentId: string } | null>(null),
  };
  const reconnected = signal(0);

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Realtime, useValue: fakeRealtime({ ...realtime, reconnected }) },
      ],
    });
  });

  const loadedWith = async (body: Category[]) => {
    const categories = TestBed.runInInjectionContext(() =>
      categoriesResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectOne(url).flush(body);
    await vi.waitFor(() => expect(categories.hasValue()).toBe(true));
    return categories;
  };

  it('should follow categories as they are created, renamed and deleted', async () => {
    const categories = await loadedWith([category('1')]);

    realtime.categoryCreated.set(category('2'));
    TestBed.tick();
    realtime.categoryUpdated.set(category('1', 'Bebidas'));
    TestBed.tick();
    realtime.categoryDeleted.set({ id: '2' });
    TestBed.tick();

    expect(categories.value()).toEqual([category('1', 'Bebidas')]);
  });

  it('should ask for the categories again when the stream comes back, in case it missed a change', async () => {
    await loadedWith([category('1')]);

    reconnected.update((count) => count + 1);
    TestBed.tick();

    TestBed.inject(HttpTestingController).expectOne(url);
  });
});
