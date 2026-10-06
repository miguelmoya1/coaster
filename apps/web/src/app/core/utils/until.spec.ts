import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { until } from './until';

describe('until', () => {
  it('should settle only once the condition holds', async () => {
    const loaded = signal(false);
    let settled = false;

    const waiting = until(() => loaded(), TestBed.inject(Injector)).then(() => (settled = true));
    TestBed.tick();
    await Promise.resolve();
    expect(settled).toBe(false);

    loaded.set(true);
    TestBed.tick();
    await waiting;
    expect(settled).toBe(true);
  });
});
