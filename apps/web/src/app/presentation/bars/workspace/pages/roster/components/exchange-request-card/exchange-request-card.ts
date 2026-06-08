import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'coaster-exchange-request-card',
  imports: [MatIcon, TranslatePipe, MatButton],
  template: `
    <div class="flex gap-4">
      <div
        class="flex flex-col items-center justify-center bg-surface-container h-16 w-16 rounded-2xl border border-outline-variant/20"
      >
        <span class="label-sm font-bold text-on-surface-variant">{{ month() }}</span>
        <span class="title-lg font-black text-primary">{{ day() }}</span>
      </div>

      <div class="flex flex-col justify-center">
        <p class="label-sm text-on-surface-variant uppercase font-bold">{{ shiftPeriod() | translate }}</p>
        <h4 class="title-lg font-bold">{{ roleName() }}</h4>
        <p class="body-md text-on-surface-variant">{{ timeRange() }}</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <div class="text-right hidden sm:block">
        <p class="label-sm text-on-surface-variant uppercase font-bold">
          {{ 'roster.exchanges.offered_by' | translate }}
        </p>
        <p class="body-md font-semibold">{{ offeredBy() }}</p>
      </div>
      @if (!isOwnRequest()) {
        <button
          mat-flat-button
          [disabled]="disabled()"
          (click)="accepted.emit(); $event.stopPropagation()"
          class="shrink-0"
        >
          {{ 'common.accept' | translate }}
          <mat-icon class="text-lg">cached</mat-icon>
        </button>
      }
      @if (canDelete()) {
        <button
          mat-stroked-button
          color="warn"
          [disabled]="disabled()"
          (click)="delete.emit(); $event.stopPropagation()"
          class="shrink-0"
        >
          <mat-icon class="text-lg">delete</mat-icon>
        </button>
      }
    </div>
  `,
  host: {
    class:
      'bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 block',
  },
  })
export class ExchangeRequestCard {
  readonly month = input.required<string>();
  readonly day = input.required<string>();
  readonly shiftPeriod = input.required<string>();
  readonly roleName = input.required<string>();
  readonly timeRange = input.required<string>();
  readonly offeredBy = input.required<string>();
  readonly disabled = input(false);
  readonly isOwnRequest = input(false);
  readonly canDelete = input(false);
  readonly accepted = output<void>();
  readonly delete = output<void>();
}
