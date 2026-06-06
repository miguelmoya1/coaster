import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'coaster-section-title',
  template: `
    @if (isH1()) {
      <h1 [class]="'font-black text-primary text-3xl tracking-tighter md:text-4xl ' + structuralClasses()">{{ heading() }}</h1>
    } @else {
      <h2 [class]="'font-black text-on-surface text-2xl tracking-tight md:text-3xl ' + structuralClasses()">{{ heading() }}</h2>
    }

    @if (description()) {
      <p class="text-on-surface-variant text-sm">{{ description() }}</p>
    }
  `,
  host: {
    '[class]': 'wrapperClasses()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionTitle {
  readonly heading = input.required<string>();
  readonly description = input<string>();
  readonly isH1 = input(false, { transform: booleanAttribute });
  readonly centered = input(false, { transform: booleanAttribute });

  protected wrapperClasses = computed(() => {
    let base = 'flex flex-col gap-2';
    if (this.centered()) {
      base += ' items-center text-center';
    }
    return base;
  });

  protected structuralClasses = computed(() => {
    if (!this.description()) {
      return 'border-b border-outline-variant pb-2';
    }
    return '';
  });
}
