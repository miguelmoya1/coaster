import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'dashed';

const BASE_CLASSES =
  'w-full rounded-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100 disabled:hover:brightness-100 active:scale-[0.98]';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'h-16 bg-linear-to-br from-primary to-primary-container shadow-elevated-primary hover:brightness-110',
  outline: 'h-16 border border-outline-variant hover:bg-surface-container',
  dashed: 'h-24 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary/5',
};

const TEXT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'text-on-primary-fixed font-bold uppercase tracking-widest text-sm',
  outline: 'text-on-surface font-bold uppercase tracking-widest text-sm',
  dashed: 'text-on-surface-variant font-bold uppercase tracking-widest text-sm hover:text-primary',
};

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[coaster-btn], a[coaster-btn]',
  template: `
    <ng-content />
  `,
  host: {
    '[class]': 'computedClasses()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoasterBtn {
  readonly variant = input<ButtonVariant>('primary');

  readonly computedClasses = computed(
    () => `${BASE_CLASSES} ${VARIANT_CLASSES[this.variant()]} ${TEXT_CLASSES[this.variant()]}`,
  );
}
