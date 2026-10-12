import { resourceFromSnapshots, signal, type ResourceSnapshot } from '@angular/core';
import type { PageResource } from '@coaster/core';
import { vi } from 'vitest';

export const fakeResource = <T>(value?: T) => {
  const snapshot = signal<ResourceSnapshot<T | undefined>>(
    value === undefined ? { status: 'loading', value: undefined } : { status: 'resolved', value },
  );
  const reload = vi.fn(() => true);
  const resource: PageResource<T> = Object.assign(resourceFromSnapshots(snapshot), { reload });

  return {
    resource,
    resolve: (next: T) => snapshot.set({ status: 'resolved', value: next }),
    fail: (error: Error) => snapshot.set({ status: 'error', error }),
    reload,
  };
};
