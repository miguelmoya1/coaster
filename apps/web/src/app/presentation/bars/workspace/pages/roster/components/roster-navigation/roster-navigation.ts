import { Component, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-roster-navigation',
  imports: [MatIcon, MatButton, MatIconButton, TranslatePipe],
  template: `
    <div class="flex flex-col gap-3.5 mb-5 select-none">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <h1
            class="heading-1 m-0! leading-none! select-none text-2xl sm:text-3xl font-black text-white uppercase tracking-tight truncate"
          >
            {{ 'roster.title' | translate }}
          </h1>

          <span
            class="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider bg-surface-container-high text-on-surface-variant border border-outline-variant/20 shrink-0 shadow-xs"
          >
            {{ displayMonthYear() }}
          </span>
        </div>
      </div>

      <div
        class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-container/60 p-1.5 sm:p-2 rounded-2xl border border-outline-variant/15 backdrop-blur-md"
      >
        <div
          class="flex items-center justify-between sm:justify-start bg-surface-container rounded-xl p-1 border border-outline-variant/15 shrink-0"
        >
          <button mat-icon-button (click)="prev.emit()" title="{{ 'common.prev' | translate }}">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-button (click)="today.emit()" class="font-bold text-xs sm:text-sm">
            {{ 'roster.today' | translate }}
          </button>
          <button mat-icon-button (click)="next.emit()" title="{{ 'common.next' | translate }}">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>

        <div
          class="grid grid-cols-3 sm:flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/15 w-full sm:w-auto"
        >
          @if (viewMode() === 'day') {
            <button mat-flat-button (click)="viewChanged.emit('day')" class="w-full sm:w-auto">
              {{ 'roster.views.day' | translate }}
            </button>
          } @else {
            <button mat-button (click)="viewChanged.emit('day')" class="w-full sm:w-auto">
              {{ 'roster.views.day' | translate }}
            </button>
          }

          @if (viewMode() === 'week') {
            <button mat-flat-button (click)="viewChanged.emit('week')" class="w-full sm:w-auto">
              {{ 'roster.views.week' | translate }}
            </button>
          } @else {
            <button mat-button (click)="viewChanged.emit('week')" class="w-full sm:w-auto">
              {{ 'roster.views.week' | translate }}
            </button>
          }

          @if (viewMode() === 'month') {
            <button mat-flat-button (click)="viewChanged.emit('month')" class="w-full sm:w-auto">
              {{ 'roster.views.month' | translate }}
            </button>
          } @else {
            <button mat-button (click)="viewChanged.emit('month')" class="w-full sm:w-auto">
              {{ 'roster.views.month' | translate }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export class RosterNavigation {
  readonly displayMonthYear = input.required<string>();
  readonly viewMode = input.required<'day' | 'week' | 'month'>();

  readonly prev = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
  readonly viewChanged = output<'day' | 'week' | 'month'>();
}
