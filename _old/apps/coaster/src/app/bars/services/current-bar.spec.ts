import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { asBarId, Bar, BarId } from '@coaster/interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  describe('currentId', () => {
    it('should be undefined at start', () => {
      expect(service.currentId()).toBeUndefined();
    });
  });

  describe('current', () => {
    it('should not have value at start', () => {
      expect(service.current.status()).toBe('idle');
      expect(service.current.hasValue()).toBe(false);
      expect(service.current.isLoading()).toBe(false);
    });

    it('should call the bar repository when setBarContext is called', () => {
      const barId: BarId = asBarId('bar-1');

      service.setBarContext(barId);
      TestBed.tick();
      expect(repositoryMock.routes.bar).toHaveBeenCalledWith(barId);
    });

    it('should be set when setBarContext is called', async () => {
      service.setBarContext(asBarId('bar-1'));

      TestBed.tick();

      expect(service.current.isLoading()).toBe(true);

      const mockBar: Bar = {
        id: asBarId('bar-1'),
        name: 'Bar 1',
      };

      httpMock.expectOne('/bars/bar-1').flush(mockBar);

      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.current.isLoading()).toBe(false);
      expect(service.current.hasValue()).toBe(true);
      expect(service.current.value()).toEqual(mockBar);
    });
  });

  describe('setBarContext', () => {
    it('should be set when setBarContext is called', () => {
      service.setBarContext(asBarId('bar-1'));
      expect(service.currentId()).toBe(asBarId('bar-1'));
    });

    it('should be undefined when setBarContext is called with undefined', () => {
      service.setBarContext(asBarId('bar-1'));
      service.setBarContext(undefined);
      expect(service.currentId()).toBeUndefined();
    });
  });

  describe('reload', () => {
    it('should reload the current bar', async () => {
      service.setBarContext(asBarId('bar-1'));

      TestBed.tick();

      const mockBar: Bar = {
        id: asBarId('bar-1'),
        name: 'Bar 1',
      };

      httpMock.expectOne('/bars/bar-1').flush(mockBar);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.current.value()).toEqual(mockBar);

      service.reload();
      TestBed.tick();

      expect(service.current.isLoading()).toBe(true);

      const mockBarReloaded: Bar = {
        id: asBarId('bar-1-reloaded'),
        name: 'Bar 1 Reloaded',
      };

      httpMock.expectOne('/bars/bar-1').flush(mockBarReloaded);
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.current.value()).toEqual(mockBarReloaded);
    });
  });
});
