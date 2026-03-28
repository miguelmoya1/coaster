import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';

export type ButtonVariant = 'primary' | 'outline' | 'dashed';

@Component({
  selector: 'coaster-button',
  imports: [NgIcon],
  template: `
    <button [type]="type()" [disabled]="disabled()" [class]="computedClasses()">
      @if (icon() && iconPos() === 'left') {
        <ng-icon [name]="icon()!" [class]="iconClasses()"></ng-icon>
      }
      <span [class]="textClasses()">
        <ng-content></ng-content>
      </span>
      @if (icon() && iconPos() === 'right') {
        <ng-icon [name]="icon()!" [class]="iconClasses()"></ng-icon>
      }
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly icon = input<string>();
  readonly iconPos = input<'left' | 'right'>('right');
  readonly customClass = input('');
  readonly disabled = input(false);

  readonly computedClasses = computed(() => {
    // Base styles all buttons share
    const base =
      'w-full rounded-xl flex items-center justify-center gap-3 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100 disabled:hover:brightness-100 active:scale-[0.98]';

    // Variant specific styles
    let variantStyles = '';
    switch (this.variant()) {
      case 'primary':
        variantStyles =
          'h-16 bg-linear-to-br from-primary to-primary-container shadow-elevated-primary hover:brightness-110';
        break;
      case 'outline':
        variantStyles =
          'h-16 border border-outline-variant hover:bg-surface-container';
        break;
      case 'dashed':
        variantStyles =
          'h-24 border-2 border-dashed border-outline-variant hover:border-primary hover:bg-primary/5';
        break;
    }

    return `${base} ${variantStyles} ${this.customClass()}`;
  });

  readonly textClasses = computed(() => {
    switch (this.variant()) {
      case 'primary':
        return 'text-on-primary-fixed font-bold uppercase tracking-widest text-sm';
      case 'outline':
        return 'text-on-surface font-bold uppercase tracking-widest text-sm';
      case 'dashed':
        return 'text-on-surface-variant font-bold uppercase tracking-widest text-sm hover:text-primary';
    }
  });

  readonly iconClasses = computed(() => {
    switch (this.variant()) {
      case 'primary':
        return 'text-on-primary-fixed text-xl';
      case 'outline':
        return 'text-on-surface text-xl';
      case 'dashed':
        return 'text-on-surface-variant text-xl hover:text-primary';
    }
  });
}
