import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';


@Component({
  selector: 'coaster-roster-navigation',
  imports: [MatIcon, MatButtonModule, TranslatePipe],
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
          <button
            mat-icon-button
            (click)="prev.emit()"
            title="{{ 'common.prev' | translate }}"
          >
            <mat-icon>chevron_left</mat-icon>
          </button>
          <button
            (click)="today.emit()"
            class="px-3 py-1.5 hover:bg-surface-container-high text-xs font-bold text-on-surface-variant hover:text-white rounded-lg transition-all cursor-pointer active:scale-95"
          >
            {{ 'roster.today' | translate }}
          </button>
          <button
            mat-icon-button
            (click)="next.emit()"
            title="{{ 'common.next' | translate }}"
          >
            <mat-icon>chevron_right</mat-icon>
          </button>
        </div>
      </div>

      <!-- Right Side: Segmented View Toggle (Perfectly centered vertically on desktop/tablet) -->
      <div
        class="flex items-center bg-surface-container rounded-2xl p-1 border border-outline-variant/15 max-w-max self-center md:self-auto"
      >
        <button
          (click)="viewChanged.emit('day')"
          [class.bg-primary]="viewMode() === 'day'"
          [class.text-on-primary-fixed]="viewMode() === 'day'"
          [class.font-black]="viewMode() === 'day'"
          [class.text-on-surface-variant]="viewMode() !== 'day'"
          class="px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer select-none"
        >
          {{ 'roster.views.day' | translate }}
        </button>
        <button
          (click)="viewChanged.emit('week')"
          [class.bg-primary]="viewMode() === 'week'"
          [class.text-on-primary-fixed]="viewMode() === 'week'"
          [class.font-black]="viewMode() === 'week'"
          [class.text-on-surface-variant]="viewMode() !== 'week'"
          class="px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer select-none"
        >
          {{ 'roster.views.week' | translate }}
        </button>
        <button
          (click)="viewChanged.emit('month')"
          [class.bg-primary]="viewMode() === 'month'"
          [class.text-on-primary-fixed]="viewMode() === 'month'"
          [class.font-black]="viewMode() === 'month'"
          [class.text-on-surface-variant]="viewMode() !== 'month'"
          class="px-4 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer select-none"
        >
          {{ 'roster.views.month' | translate }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RosterNavigation {
  readonly displayMonthYear = input.required<string>();
  readonly viewMode = input.required<'day' | 'week' | 'month'>();

  readonly prev = output<void>();
  readonly next = output<void>();
  readonly today = output<void>();
  readonly viewChanged = output<'day' | 'week' | 'month'>();
}
