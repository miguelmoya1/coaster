import { Component, computed, input } from '@angular/core';

export type PageContainerSize = 'sm' | 'md' | 'lg' | 'full';

@Component({
  selector: 'coaster-page-container',
  template: `<ng-content />`,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class PageContainer {
  public readonly size = input<PageContainerSize>('lg');

  protected readonly hostClasses = computed(() => {
    const base = 'block w-full mx-auto flex-1 min-h-0 flex flex-col transition-all duration-300';
    switch (this.size()) {
      case 'sm':
        return `${base} max-w-xl`;
      case 'md':
        return `${base} max-w-4xl`;
      case 'full':
        return `${base} max-w-full`;
      case 'lg':
      default:
        return `${base} max-w-7xl`;
    }
  });
}
