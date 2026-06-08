import { Component, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-shift-card',
  imports: [TranslatePipe, MatButton, MatIcon, MatIconButton],
  template: `
    <div
      [class]="
        compact() ? 'w-10 h-10 rounded-lg overflow-hidden shrink-0' : 'w-14 h-14 rounded-xl overflow-hidden shrink-0'
      "
    >
      @if (staffImage()) {
        <img [src]="staffImage()" alt="Staff Portrait" class="w-full h-full object-cover" />
      } @else {
        <div
          class="w-full h-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant"
        >
          <mat-icon
            [style.font-size]="compact() ? '18px' : '22px'"
            [style.width]="compact() ? '18px' : '22px'"
            [style.height]="compact() ? '18px' : '22px'"
            >person</mat-icon
          >
        </div>
      }
    </div>

    <div class="flex flex-col flex-1 min-w-0">
      <span
        [class]="
          compact()
            ? 'text-xs font-bold text-primary uppercase tracking-wide leading-none mb-1'
            : 'text-primary font-black text-2xl tracking-tighter uppercase'
        "
      >
        {{ timeRange() }}
      </span>
      <span [class]="compact() ? 'text-sm font-bold text-white truncate' : 'text-white font-bold title-lg'">
        {{ staffName() }}
      </span>
      @if (!compact() && roleName() === 'OWNER') {
        <div class="flex items-center gap-2 mt-1">
          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mat-bg-surface-container-highest mat-text-on-surface-variant"
          >
            {{ roleName() }}
          </span>
        </div>
      }
    </div>

    @if (compact()) {
      @if (isOwn()) {
        <span
          class="text-xxs font-black text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/10 uppercase shrink-0"
        >
          {{ 'roster.exchanges.your_request' | translate }}
        </span>
      }
      @if (hasPendingExchange()) {
        <span
          class="text-xxs font-black text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/10 uppercase shrink-0"
        >
          {{ 'roster.exchange_pending' | translate }}
        </span>
      }
    } @else {
      @if (isOwn()) {
        <button
          mat-stroked-button
          class="shrink-0"
          [disabled]="disabled() || hasPendingExchange() || isPast()"
          (click)="offerExchange.emit(); $event.stopPropagation()"
        >
          <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]! m-0!">cached</mat-icon>
          @if (hasPendingExchange()) {
            {{ 'roster.exchange_pending' | translate }}
          } @else {
            {{ 'roster.offer_exchange' | translate }}
          }
        </button>
      }
    }

    @if (showDelete()) {
      <button
        mat-icon-button
        [disabled]="disabled()"
        (click)="delete.emit(); $event.stopPropagation()"
        class="shrink-0"
      >
        <mat-icon class="mat-text-error text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">delete</mat-icon>
      </button>
    }
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '[class.bg-surface-container-high]': '!compact()',
    '[class.p-5]': '!compact()',
    '[class.gap-4]': '!compact()',
    '[class.bg-surface-container/40]': 'compact()',
    '[class.p-3]': 'compact()',
    '[class.gap-3]': 'compact()',
    '[class.border]': 'compact()',
    '[class.border-outline-variant/5]': 'compact()',
    class:
      'relative overflow-hidden rounded-2xl flex items-center block transition-all duration-200 hover:brightness-[1.03]',
  },
})
export class ShiftCard {
  readonly staffName = input.required<string>();
  readonly staffImage = input<string>('');
  readonly timeRange = input.required<string>();
  readonly roleName = input.required<string>();
  readonly roleColorClass = input('text-primary bg-primary');
  readonly disabled = input(false);
  readonly isOwn = input(false);
  readonly hasPendingExchange = input(false);
  readonly isPast = input(false);
  readonly showDelete = input(false);
  readonly compact = input(false);
  readonly offerExchange = output<void>();
  readonly delete = output<void>();
}
