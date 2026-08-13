import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'coaster-status-badge',
  template: `<ng-content />`,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class StatusBadge {
  readonly variant = input<'success' | 'warning' | 'error' | 'neutral'>('neutral');

  readonly hostClasses = computed(() => {
    const base =
      'inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-black uppercase tracking-wider shrink-0 leading-snug';

    switch (this.variant()) {
      case 'success':
        return `${base} text-secondary bg-secondary/10 border border-secondary/10`;
      case 'warning':
        return `${base} text-tertiary bg-tertiary/10 border border-tertiary/10`;
      case 'error':
        return `${base} text-error bg-error/10 border border-error/10`;
      case 'neutral':
      default:
        return `${base} text-on-surface-variant bg-surface-container-highest border border-outline-variant/20`;
    }
  });
}
