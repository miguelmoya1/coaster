import { Component, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-roster-navigation',
  imports: [MatIcon, MatButton, MatIconButton, MatButtonToggleGroup, MatButtonToggle, TranslatePipe],
  host: {
    class: 'flex flex-col gap-3.5 my-5 select-none',
  },
  template: `
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

    <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 sm:p-2">
      <div
        class="flex items-center justify-between sm:justify-start bg-surface-container rounded-xl p-1 border border-outline-variant/15 shrink-0"
      >
        <button mat-icon-button (click)="prev.emit()">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <button mat-button (click)="today.emit()" class="font-bold text-xs sm:text-sm">
          {{ 'roster.today' | translate }}
        </button>
        <button mat-icon-button (click)="next.emit()">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <mat-button-toggle-group [value]="viewMode()" (change)="viewChanged.emit($event.value)" class="w-full sm:w-auto">
        <mat-button-toggle value="day" class="w-1/3 sm:w-auto">
          {{ 'roster.views.day' | translate }}
        </mat-button-toggle>
        <mat-button-toggle value="week" class="w-1/3 sm:w-auto">
          {{ 'roster.views.week' | translate }}
        </mat-button-toggle>
        <mat-button-toggle value="month" class="w-1/3 sm:w-auto">
          {{ 'roster.views.month' | translate }}
        </mat-button-toggle>
      </mat-button-toggle-group>
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
