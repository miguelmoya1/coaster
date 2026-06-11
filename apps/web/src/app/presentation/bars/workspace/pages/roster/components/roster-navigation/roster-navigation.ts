import { Component, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-roster-navigation',
  imports: [MatIcon, MatButton, MatIconButton, TranslatePipe],
  template: `
    <!-- Month/Year Category Label at the top -->
    <div class="mb-1 select-none text-center md:text-left">
      <span class="text-on-surface-variant font-black uppercase tracking-widest text-[10px] sm:text-xs">
        {{ displayMonthYear() }}
      </span>
    </div>

    <!-- Main Header Action Row -->
    <div class="flex flex-col items-center md:flex-row md:items-center justify-between gap-4 mb-5 mt-1">
      <!-- Left Side: Title & Navigation Chevrons -->
      <div class="flex items-center gap-3.5 shrink-0">
        <h1
          class="heading-1 m-0! leading-none! select-none text-2xl sm:text-3xl font-black text-white uppercase tracking-tight"
        >
          {{ 'roster.title' | translate }}
        </h1>

        <!-- Date Navigation Controls (Perfectly aligned vertically with Title) -->
        <div class="flex items-center bg-surface-container rounded-xl p-1 border border-outline-variant/15 shrink-0">
          <button mat-icon-button (click)="prev.emit()" title="{{ 'common.prev' | translate }}">
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button mat-button (click)="today.emit()">
            {{ 'roster.today' | translate }}
          </button>
          <button mat-icon-button (click)="next.emit()" title="{{ 'common.next' | translate }}">
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right Side: Segmented View Toggle (Perfectly centered vertically on desktop/tablet) -->
      <div
        class="flex items-center bg-surface-container rounded-2xl p-1 border border-outline-variant/15 max-w-max self-center md:self-auto"
      >
        @if (viewMode() === 'day') {
          <button mat-flat-button (click)="viewChanged.emit('day')">
            {{ 'roster.views.day' | translate }}
          </button>
        } @else {
          <button mat-button (click)="viewChanged.emit('day')">
            {{ 'roster.views.day' | translate }}
          </button>
        }

        @if (viewMode() === 'week') {
          <button mat-flat-button (click)="viewChanged.emit('week')">
            {{ 'roster.views.week' | translate }}
          </button>
        } @else {
          <button mat-button (click)="viewChanged.emit('week')">
            {{ 'roster.views.week' | translate }}
          </button>
        }

        @if (viewMode() === 'month') {
          <button mat-flat-button (click)="viewChanged.emit('month')">
            {{ 'roster.views.month' | translate }}
          </button>
        } @else {
          <button mat-button (click)="viewChanged.emit('month')">
            {{ 'roster.views.month' | translate }}
          </button>
        }
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
