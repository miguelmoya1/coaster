import { signal } from '@angular/core';
import type { ResourceContext } from '@angular/router';
import { fakeResource } from '@coaster/testing';
import { describe, expect, it } from 'vitest';
import { establishmentIdOf, loadedOr, nonBlockingResources, queryParam } from './route-resources';

const contextWith = (params: Record<string, string>, queryParams: Record<string, string> = {}): ResourceContext => ({
  params: signal(params),
  queryParams: signal(queryParams),
  fragment: signal(null),
  data: signal({}),
});

describe('route resources', () => {
  it('should read the establishment and query params as signals', () => {
    const context = contextWith({ establishmentId: 'establishment-1' }, { date: '2026-09-24' });

    expect(establishmentIdOf(context)()).toBe('establishment-1');
    expect(queryParam(context, 'date')()).toBe('2026-09-24');
    expect(queryParam(context, 'missing')()).toBeUndefined();
  });

  it('should hand back every resource of a route without letting any of them hold the navigation', () => {
    const { resource } = fakeResource(['a']);
    const resources = nonBlockingResources(() => ({ items: resource }))(contextWith({}));

    const blocking = Object.getOwnPropertySymbols(resources['items']).map(
      (symbol) => (resources['items'] as unknown as Record<symbol, unknown>)[symbol],
    );
    expect(resources['items']).toBe(resource);
    expect(blocking).toContain(false);
  });

  it('should fall back while there is nothing loaded yet', () => {
    expect(loadedOr(fakeResource<string[]>().resource, [])).toEqual([]);
    expect(loadedOr(fakeResource(['a']).resource, [])).toEqual(['a']);
  });
});
