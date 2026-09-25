import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Category, EstablishmentId } from '@coaster/common';
import { asCategoryId, asEstablishmentId } from '@coaster/common';
import { Realtime } from '@coaster/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { categoriesResource } from './categories.resource';

const establishmentId = asEstablishmentId('establishment-1');

const category = (id: string, name = `Categoría ${id}`) =>
  ({ id: asCategoryId(id), establishmentId, name }) as Category;

describe('categoriesResource', () => {
  const realtime = {
    categoryCreated: signal<Category | null>(null),
    categoryUpdated: signal<Category | null>(null),
    categoryDeleted: signal<{ id: string } | null>(null),
    catalogueImported: signal<{ establishmentId: string } | null>(null),
  };

  beforeEach(() => {
    for (const event of Object.values(realtime)) {
      event.set(null);
    }

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: Realtime, useValue: realtime }],
    });
  });

  it('should follow categories as they are created, renamed and deleted', async () => {
    const categories = TestBed.runInInjectionContext(() =>
      categoriesResource(signal<EstablishmentId | undefined>(establishmentId)),
    );
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne(`/establishments/${establishmentId}/categories`)
      .flush([category('1')]);
    await vi.waitFor(() => expect(categories.hasValue()).toBe(true));

    realtime.categoryCreated.set(category('2'));
    TestBed.tick();
    realtime.categoryUpdated.set(category('1', 'Bebidas'));
    TestBed.tick();
    realtime.categoryDeleted.set({ id: '2' });
    TestBed.tick();

    expect(categories.value()).toEqual([category('1', 'Bebidas')]);
  });
});
