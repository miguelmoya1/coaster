import { computed, Service, signal } from '@angular/core';

@Service()
export class BottomBar {
  readonly #mountedFabs = signal(0);

  public readonly hasFab = computed(() => this.#mountedFabs() > 0);

  public registerFab(): () => void {
    this.#mountedFabs.update((count) => count + 1);

    return () => this.#mountedFabs.update((count) => Math.max(0, count - 1));
  }
}
