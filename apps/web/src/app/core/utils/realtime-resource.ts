import { effect, untracked, type Signal, type WritableResource } from '@angular/core';

export const onRealtime = <T>(event: Signal<T | null>, handler: (payload: T) => void): void => {
  const alreadySeen = untracked(event);

  effect(() => {
    const payload = event();

    if (payload !== null && payload !== alreadySeen) {
      untracked(() => handler(payload));
    }
  });
};

export const updateLoaded = <T>(resource: WritableResource<T | undefined>, updater: (value: T) => T): void => {
  const loaded: WritableResource<T | undefined> = resource;

  if (resource.hasValue()) {
    loaded.set(updater(loaded.value() as T));
  }
};

export const upsertById = <T extends { id: string }>(items: T[], item: T): T[] =>
  items.some((existing) => existing.id === item.id)
    ? items.map((existing) => (existing.id === item.id ? item : existing))
    : [...items, item];

export const removeById = <T extends { id: string }>(items: T[], id: string): T[] =>
  items.filter((existing) => existing.id !== id);

export const patchById = <T extends { id: string }>(items: T[], id: string, patch: (item: T) => T): T[] =>
  items.map((existing) => (existing.id === id ? patch(existing) : existing));
