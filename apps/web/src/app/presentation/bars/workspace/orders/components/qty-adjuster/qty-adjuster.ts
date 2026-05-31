import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucidePlus } from '@ng-icons/lucide';

@Component({
  selector: 'coaster-qty-adjuster',
  imports: [NgIcon],
  viewProviders: [provideIcons({ lucideMinus, lucidePlus })],
  host: {
    class:
      'flex items-center gap-1.5 bg-surface-container-highest/60 rounded-xl p-1.5 border border-outline-variant/20 shrink-0',
    '(click)': 'onHostClick($event)',
  },
  template: `
    @if (label()) {
      <span class="text-xxs font-bold text-on-surface-variant px-1.5 select-none">{{ label() }}</span>
    }
    <button
      type="button"
      class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center transition-transform shrink-0"
      [class.opacity-30]="value() <= min()"
      [class.cursor-not-allowed]="value() <= min()"
      [class.cursor-pointer]="value() > min()"
      [class.active:scale-90]="value() > min()"
      (click)="decrement($event)"
    >
      <ng-icon name="lucideMinus" size="10" />
    </button>

    <span class="text-xs font-semibold text-on-surface min-w-6 text-center select-none">
      {{ valueLabel() }}
    </span>

    <button
      type="button"
      class="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center transition-transform shrink-0"
      [class.opacity-30]="value() >= max()"
      [class.cursor-not-allowed]="value() >= max()"
      [class.cursor-pointer]="value() < max()"
      [class.active:scale-90]="value() < max()"
      (click)="increment($event)"
    >
      <ng-icon name="lucidePlus" size="10" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoasterQtyAdjuster {
  readonly value = model.required<number>();
  readonly min = input<number>(0);
  readonly max = input<number>(Infinity);
  readonly label = input<string | undefined>(undefined);
  readonly showPlusPrefix = input<boolean>(false);

  readonly valueLabel = computed(() => {
    const val = this.value();
    if (this.showPlusPrefix() && val > 0) {
      return `+${val}`;
    }
    return `${val}`;
  });

  onHostClick(event: Event) {
    event.stopPropagation();
  }

  decrement(event: Event) {
    event.stopPropagation();
    if (this.value() > this.min()) {
      this.value.set(this.value() - 1);
    }
  }

  increment(event: Event) {
    event.stopPropagation();
    if (this.value() < this.max()) {
      this.value.set(this.value() + 1);
    }
  }
}
