import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import type { EstablishmentId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductRepository } from '../data-access/product-repository';
import { EstablishmentProducts } from './establishment-products';

describe('EstablishmentProducts', () => {
  let service: EstablishmentProducts;
  let httpMock: HttpTestingController;

  const currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  const currentEstablishmentStoreMock = {
    currentId: currentEstablishmentId.asReadonly(),
  };

  const repositoryMock = {
    routes: {
      list: vi.fn((establishmentId: string) => `/establishments/${establishmentId}/products`),
    },
  };

  beforeEach(() => {
    currentEstablishmentId.set(undefined);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideZonelessChangeDetection(),
        { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
        { provide: ProductRepository, useValue: repositoryMock },
      ],
    });

    service = TestBed.inject(EstablishmentProducts);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
