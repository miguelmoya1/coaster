import { describe, it, expect, beforeEach, vi } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar } from '@coaster/interfaces';
import { firstValueFrom } from 'rxjs';
import { BarRepository } from '../data-access/bar-repository';
import { CurrentBar } from './current-bar';

describe('CurrentBar', () => {
  let service: CurrentBar;
  let httpMock: HttpTestingController;

  const repositoryMock = {
    create: vi.fn(),
    routes: {
      myBars: '/bars',
      bar: vi.fn().mockReturnValue('/bars/bar-1'),
      create: '/bars',
    },
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClientTesting(),
        provideHttpClient(),
        provideZonelessChangeDetection(),
        {
          provide: BarRepository,
          useValue: repositoryMock,
        },
      ],
    });

    service = TestBed.inject(CurrentBar);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('current signal', () => {
    it('should initially have undefined currentBar', () => {
      expect(service.current.value()).toBeUndefined();
    });

    it('should do not have value at start', () => {
      expect(service.current.hasValue()).toBe(false);
    });
  });

  describe('setBarContext function', () => {
    it('should set bar context', () => {
      service.setBarContext(asBarId('bar-1'));
      expect(service.current.value()).toBeUndefined();
    });
  });

  describe('current signal', () => {
    it('should fetch bar when select is called', async () => {
      const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

      service.current.value();
      TestBed.flushEffects();
      service.setBarContext(asBarId('bar-1'));
      service.current.value();

      TestBed.flushEffects();

      repositoryMock.routes.bar.mockReturnValue('/bars/bar-1');
      expect(repositoryMock.routes.bar).toHaveBeenCalledWith(asBarId('bar-1'));

      const req = httpMock.expectOne('/bars/bar-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockBar);

      await TestBed.runInInjectionContext(() => firstValueFrom(toObservable(service.current.value)));
      expect(service.current.value()).toEqual(mockBar);
    });

    it('should not fetch bar when select is called with same bar id', async () => {
      const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

      service.current.value();
      TestBed.flushEffects();

      service.setBarContext(asBarId('bar-1'));
      service.current.value();
      TestBed.flushEffects();

      const req = httpMock.expectOne('/bars/bar-1');
      expect(req.request.method).toBe('GET');

      req.flush(mockBar);
      service.current.value();

      TestBed.flushEffects();
      expect(service.current.value()).toEqual(mockBar);
    });

    it('should not fetch bar when select is called with different bar id', async () => {
      const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

      service.current.value();
      TestBed.flushEffects();

      service.setBarContext(asBarId('bar-1'));
      service.current.value();
      TestBed.flushEffects();

      const req = httpMock.expectOne('/bars/bar-1');
      expect(req.request.method).toBe('GET');

      req.flush(mockBar);
      service.current.value();

      TestBed.flushEffects();
      expect(service.current.value()).toEqual(mockBar);
    });
  });

  describe('reload function', () => {
    it('should be created', () => {
      expect(service.reload).toBeTruthy();
    });

    it('should fetch bar when reload is called', async () => {
      const mockBar: Bar = { id: asBarId('bar-1'), name: 'Test Bar' };

      service.setBarContext(asBarId('bar-1'));
      service.current.value();
      TestBed.flushEffects();
      const req = httpMock.expectOne('/bars/bar-1');
      expect(req.request.method).toBe('GET');
      req.flush(mockBar);

      service.reload();
      TestBed.flushEffects();
      const req2 = httpMock.expectOne('/bars/bar-1');
      expect(req2.request.method).toBe('GET');
      req2.flush(mockBar);

      expect(service.current.value()).toEqual(mockBar);
    });
  });
});
