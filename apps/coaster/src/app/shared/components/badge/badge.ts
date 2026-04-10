import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral';

const BASE_CLASSES = 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-secondary/15 text-secondary',
  warning: 'bg-tertiary/15 text-tertiary',
  error: 'bg-error/15 text-error',
  neutral: 'bg-on-surface/10 text-on-surface-variant',
};

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'span[coaster-badge]',
  template: `
    <ng-content />
  `,
  host: {
    '[class]': 'computedClasses()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoasterBadge {
  readonly variant = input<BadgeVariant>('neutral');

  readonly computedClasses = computed(
    () => `${BASE_CLASSES} ${VARIANT_CLASSES[this.variant()]}`,
  );
}
