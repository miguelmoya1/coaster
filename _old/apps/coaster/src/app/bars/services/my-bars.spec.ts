import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { Auth } from '../../core';
import { BarRepository } from '../data-access/bar-repository';
import { MyBars } from './my-bars';

describe('MyBars', () => {
  let service: MyBars;
  let httpMock: HttpTestingController;
  const isAuthenticated = signal(true);
  const authMock = {
    isAuthenticated: isAuthenticated.asReadonly(),
  };
  const barRepositoryMock = {
    routes: {
      myBars: '/bars',
    },
  };

  beforeEach(async () => {
    isAuthenticated.set(true);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        { provide: Auth, useValue: authMock },
        { provide: BarRepository, useValue: barRepositoryMock },
      ],
    });

    service = TestBed.inject(MyBars);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('all', () => {
    it('should be loading at start when authenticated', () => {
      expect(service.all.status()).toBe('loading');
      expect(service.all.hasValue()).toBe(false);
      expect(service.all.isLoading()).toBe(true);
    });

    it('should be idle at start when not authenticated', () => {
      isAuthenticated.set(false);
      TestBed.tick();

      service = TestBed.inject(MyBars);

      expect(service.all.hasValue()).toBe(false);
    });

    it('should fetch bars when authenticated', async () => {
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);

      const mockBars: Bar[] = [
        { id: asBarId('bar-1'), name: 'Bar 1' },
        { id: asBarId('bar-2'), name: 'Bar 2' },
      ];

      httpMock.expectOne('/bars').flush(mockBars);

      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.isLoading()).toBe(false);
      expect(service.all.hasValue()).toBe(true);
      expect(service.all.value()).toEqual(mockBars);
    });

    it('should not fetch bars when not authenticated', () => {
      isAuthenticated.set(false);

      TestBed.tick();

      httpMock.expectNone('/bars');

      expect(service.all.isLoading()).toBe(false);
    });
  });

  describe('reload', () => {
    it('should reload the bars', async () => {
      TestBed.tick();

      const mockBars: Bar[] = [{ id: asBarId('bar-1'), name: 'Bar 1' }];

      httpMock.expectOne('/bars').flush(mockBars);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.value()).toEqual(mockBars);

      service.reload();
      TestBed.tick();

      expect(service.all.isLoading()).toBe(true);

      const mockBarsReloaded: Bar[] = [
        { id: asBarId('bar-1'), name: 'Bar 1' },
        { id: asBarId('bar-2'), name: 'Bar 2' },
      ];

      httpMock.expectOne('/bars').flush(mockBarsReloaded);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.all.value()).toEqual(mockBarsReloaded);
    });
  });
});
