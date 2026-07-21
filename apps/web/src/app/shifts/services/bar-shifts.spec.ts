import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CurrentBarStore } from '@coaster/bars';
import type { BarId } from '@coaster/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShiftRepository } from '../data-access/shift-repository';
import { BarShifts } from './bar-shifts';

describe('BarShifts', () => {
  let service: BarShifts;
  let httpMock: HttpTestingController;

  const currentBarId = signal<BarId | undefined>(undefined);

  const currentBarStoreMock = {
    currentId: currentBarId.asReadonly(),
  };

  const mockRoutes = {
    list: (barId: string, startDate: string, endDate: string) =>
      `/bars/${barId}/shifts?startDate=${startDate}&endDate=${endDate}`,
  };

  beforeEach(() => {
    currentBarId.set(undefined);
    vi.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClientTesting(),
        { provide: CurrentBarStore, useValue: currentBarStoreMock },
        { provide: ShiftRepository, useValue: { routes: mockRoutes } },
      ],
    });

    service = TestBed.inject(BarShifts);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
