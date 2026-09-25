import { resource, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { onRealtime, patchById, removeById, updateLoaded, upsertById } from './realtime-resource';

describe('realtime resource helpers', () => {
  describe('onRealtime', () => {
    it('should ignore the event that was already there when it started listening', () => {
      const event = signal<{ id: string } | null>({ id: 'stale' });
      const handler = vi.fn();

      TestBed.runInInjectionContext(() => onRealtime(event, handler));
      TestBed.tick();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should hand over every event that arrives afterwards', () => {
      const event = signal<{ id: string } | null>(null);
      const handler = vi.fn();

      TestBed.runInInjectionContext(() => onRealtime(event, handler));
      event.set({ id: 'fresh' });
      TestBed.tick();

      expect(handler).toHaveBeenCalledWith({ id: 'fresh' });
    });
  });

  describe('updateLoaded', () => {
    it('should leave a resource alone while it is still loading, so the request is not overwritten', () => {
      const pending = TestBed.runInInjectionContext(() =>
        resource({ loader: () => new Promise<string[]>(() => undefined) }),
      );

      updateLoaded(pending, (items) => [...items, 'x']);

      expect(pending.status()).toBe('loading');
    });

    it('should update a resource that already has a value', async () => {
      const loaded = TestBed.runInInjectionContext(() => resource({ loader: async () => ['a'] }));
      await vi.waitFor(() => expect(loaded.hasValue()).toBe(true));

      updateLoaded(loaded, (items) => [...items, 'b']);

      expect(loaded.value()).toEqual(['a', 'b']);
    });
  });

  it('should replace an item by id, or add it when it is new', () => {
    const items = [{ id: 'a', n: 1 }];

    expect(upsertById(items, { id: 'a', n: 2 })).toEqual([{ id: 'a', n: 2 }]);
    expect(upsertById(items, { id: 'b', n: 1 })).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 1 },
    ]);
  });

  it('should remove and patch items by id', () => {
    const items = [
      { id: 'a', n: 1 },
      { id: 'b', n: 1 },
    ];

    expect(removeById(items, 'a')).toEqual([{ id: 'b', n: 1 }]);
    expect(patchById(items, 'b', (item) => ({ ...item, n: 5 }))).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 5 },
    ]);
  });
});
