import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRepeat2, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'coaster-exchange-request-card',
  imports: [NgIcon, TranslatePipe, MatButton],
  viewProviders: [provideIcons({ lucideRepeat2, lucideTrash2 })],
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
          class="w-auto! h-12! px-6 shrink-0 uppercase tracking-wide text-sm"
        >
          {{ 'common.accept' | translate }}
          <ng-icon name="lucideRepeat2" class="text-lg"></ng-icon>
        </button>
      }
      @if (canDelete()) {
        <button
          mat-stroked-button
          [disabled]="disabled()"
          (click)="delete.emit(); $event.stopPropagation()"
          class="w-12! h-12! p-0 shrink-0 text-error! hover:bg-error/10! hover:text-error! border-error/20! hover:border-error/40! active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <ng-icon name="lucideTrash2" class="text-lg"></ng-icon>
        </button>
      }
    </div>
  `,
  host: {
    class:
      'bg-surface-container-low border border-outline-variant/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 block',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
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
