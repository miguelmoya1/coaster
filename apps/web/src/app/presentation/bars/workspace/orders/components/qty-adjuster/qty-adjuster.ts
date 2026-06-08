import { Component, computed, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-qty-adjuster',
  imports: [MatButtonModule, MatIcon],
  host: {
    class:
      'flex items-center gap-1.5 bg-surface-container-highest/60 rounded-xl p-1.5 border border-outline-variant/20 shrink-0',
    '(click)': 'onHostClick($event)',
  },
  template: `
    @if (label()) {
      <span class="text-xxs font-bold text-on-surface-variant px-1.5 select-none">{{ label() }}</span>
    }
    <button mat-icon-button
      type="button"
      [disabled]="value() <= min()"
      (click)="decrement($event)"
    >
      <mat-icon style="font-size: 10px; width: 10px; height: 10px;">remove</mat-icon>
    </button>

    <span class="text-xs font-semibold text-on-surface min-w-6 text-center select-none">
      {{ valueLabel() }}
    </span>

    <button mat-icon-button
      type="button"
      [disabled]="value() >= max()"
      (click)="increment($event)"
    >
      <mat-icon style="font-size: 10px; width: 10px; height: 10px;">add</mat-icon>
    </button>
  `,
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
