import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-shift-card',
  imports: [TranslatePipe, MatButton, MatIcon],
  template: `
    <div class="w-14 h-14 rounded-xl overflow-hidden shrink-0">
      <img [src]="staffImage()" alt="Staff Portrait" class="w-full h-full object-cover" />
    </div>

    <div class="flex flex-col flex-1">
      <span class="text-primary font-black text-2xl tracking-tighter uppercase">{{ timeRange() }}</span>
      <span class="text-white font-bold title-lg">{{ staffName() }}</span>
      <div class="flex items-center gap-2 mt-1">
        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mat-bg-surface-container-highest mat-text-on-surface-variant">
          {{ roleName() }}
        </span>
      </div>
    </div>

    @if (isOwn()) {
      <button
        mat-stroked-button
        class="shrink-0"
        [disabled]="disabled() || hasPendingExchange() || isPast()"
        (click)="offerExchange.emit(); $event.stopPropagation()"
      >
        <mat-icon style="font-size: 16px; width: 16px; height: 16px;">cached</mat-icon>
        @if (hasPendingExchange()) {
          {{ 'roster.exchange_pending' | translate }}
        } @else {
          {{ 'roster.offer_exchange' | translate }}
        }
      </button>
    }

    @if (showDelete()) {
      <button
        mat-stroked-button
        color="warn"
        class="shrink-0"
        [disabled]="disabled()"
        (click)="delete.emit(); $event.stopPropagation()"
      >
        <mat-icon style="font-size: 18px; width: 18px; height: 18px;">delete</mat-icon>
      </button>
    }
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    class: 'relative overflow-hidden bg-surface-container-high rounded-2xl p-5 flex items-center gap-4 block',
  },
  })
export class ShiftCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input.required<string>();
  readonly timeRange = input.required<string>();
  readonly roleName = input.required<string>();
  readonly roleColorClass = input('text-primary bg-primary');
  readonly disabled = input(false);
  readonly isOwn = input(false);
  readonly hasPendingExchange = input(false);
  readonly isPast = input(false);
  readonly showDelete = input(false);
  readonly offerExchange = output<void>();
  readonly delete = output<void>();
}
