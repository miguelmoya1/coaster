import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import type { EstablishmentId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftRepository } from '../data-access/shift-repository';
import { EstablishmentShifts } from './establishment-shifts';

describe('EstablishmentShifts', () => {
  let service: EstablishmentShifts;
  let httpMock: HttpTestingController;

  const currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);

  const currentEstablishmentStoreMock = {
    currentId: currentEstablishmentId.asReadonly(),
  };

  const mockRoutes = {
    list: (establishmentId: string, startDate: string, endDate: string) =>
      `/establishments/${establishmentId}/shifts?startDate=${startDate}&endDate=${endDate}`,
  };

  beforeEach(() => {
    currentEstablishmentId.set(undefined);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClientTesting(),
        { provide: CurrentEstablishmentStore, useValue: currentEstablishmentStoreMock },
        { provide: ShiftRepository, useValue: { routes: mockRoutes } },
      ],
    });

    service = TestBed.inject(EstablishmentShifts);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
