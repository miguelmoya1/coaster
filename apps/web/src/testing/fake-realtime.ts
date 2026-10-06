import { signal, type Signal } from '@angular/core';

export const fakeRealtime = <T extends object>(events: T) => ({
  reconnected: signal(0),
  ...events,
  on: (event: string): Signal<unknown> => (events as Record<string, Signal<unknown>>)[event] ?? signal(null),
});
