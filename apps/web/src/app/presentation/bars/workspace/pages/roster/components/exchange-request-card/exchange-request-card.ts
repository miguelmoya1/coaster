import { Component, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { BarRole } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-exchange-request-card',
  imports: [MatIcon, TranslatePipe, MatButton, MatIconButton],
  template: `
    <div class="flex items-center gap-4 min-w-0">
      <div
        class="flex flex-col items-center justify-center bg-primary/10 text-primary h-14 w-14 rounded-xl border border-primary/20 shrink-0 animate-pulse-slow"
      >
        <span class="text-[0.65rem] font-bold uppercase tracking-wider leading-none">{{ month() }}</span>
        <span class="text-2xl font-black leading-none mt-0.5">{{ day() }}</span>
      </div>

      <div class="flex flex-col justify-center min-w-0">
        <span class="text-primary font-black text-2xl tracking-tighter uppercase leading-none mb-1">
          {{ timeRange() }}
        </span>
        <span class="text-white font-bold title-lg leading-tight truncate">
          {{ offeredBy() }}
        </span>
        @if (roleName() === BarRole.OWNER) {
          <div class="flex items-center gap-2 mt-1">
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mat-bg-surface-container-highest mat-text-on-surface-variant"
            >
              {{ roleName() }}
            </span>
          </div>
        }
      </div>
    </div>

    <div class="flex items-center gap-3 shrink-0">
      @if (!isOwnRequest()) {
        <button
          mat-flat-button
          [disabled]="disabled()"
          (click)="accepted.emit(); $event.stopPropagation()"
          class="shrink-0"
        >
          <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]! m-0!">cached</mat-icon>
          {{ 'common.accept' | translate }}
        </button>
      } @else {
        <span
          class="text-xxs font-black text-tertiary bg-tertiary/10 px-2.5 py-1 rounded-full border border-tertiary/10 uppercase shrink-0"
        >
          {{ 'roster.exchanges.your_request' | translate }}
        </span>
      }
      @if (canDelete()) {
        <button
          mat-icon-button
          [disabled]="disabled()"
          (click)="delete.emit(); $event.stopPropagation()"
          class="shrink-0"
        >
          <mat-icon class="mat-text-error text-[18px]! w-[18px]! h-[18px]! leading-[18px]! m-0!">delete</mat-icon>
        </button>
      }
    </div>
  `,
  host: {
    '[class.opacity-50]': 'disabled()',
    '[class.cursor-not-allowed]': 'disabled()',
    '[class.pointer-events-none]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    class:
      'relative overflow-hidden bg-surface-container-high rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 block transition-all duration-200 hover:brightness-[1.03]',
  },
})
export class ExchangeRequestCard {
  protected readonly BarRole = BarRole;
  readonly month = input.required<string>();
  readonly day = input.required<string>();
  readonly roleName = input.required<string>();
  readonly timeRange = input.required<string>();
  readonly offeredBy = input.required<string>();
  readonly disabled = input(false);
  readonly isOwnRequest = input(false);
  readonly canDelete = input(false);
  readonly accepted = output<void>();
  readonly delete = output<void>();
}
