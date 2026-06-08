import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { Shift, BarRole } from '@coaster/common';

export interface WeeklyShiftItem extends Shift {
  timeRange: string;
  roleName: BarRole;
  hasPendingExchange: boolean;
  isOwn: boolean;
  isPast: boolean;
}

export interface WeeklyDayItem {
  date: Date;
  dayId: string;
  dayName: string;
  dayNumber: number;
  shifts: WeeklyShiftItem[];
  isToday: boolean;
  isActive: boolean;
}

@Component({
  selector: 'coaster-roster-weekly-grid',
  imports: [MatIcon, MatButtonModule, TranslatePipe],
  template: `
    <!-- Owner Quick Replicate Action -->
    @if (currentUserRole() === 'OWNER') {
      <div
        class="mb-6 bg-linear-to-r from-primary/8 via-primary/3 to-transparent border border-primary/15 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div class="flex flex-col gap-1 min-w-0">
          <h3 class="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            {{ 'roster.replication.title' | translate }}
          </h3>
          <p class="text-xs text-on-surface-variant leading-relaxed max-w-xl">
            {{ 'roster.replication.description' | translate }}
          </p>
        </div>
        <button
          mat-flat-button
          (click)="replicatePreviousWeek.emit()"
          [disabled]="isSubmitting()"
          class="shrink-0 self-start md:self-auto"
        >
          <mat-icon style="font-size: 14px; width: 14px; height: 14px;">content_copy</mat-icon>
          {{ 'roster.replication.button' | translate }}
        </button>
      </div>
    }

    <div class="flex flex-col gap-6">
      @for (day of weekDays(); track day.dayId) {
        <div
          class="border border-outline-variant/10 rounded-3xl p-5 flex flex-col gap-3 relative transition-all"
          [class.bg-surface-container-high]="day.isActive || day.isToday"
          [class.border-primary/45]="day.isActive"
          [class.border-primary/25]="!day.isActive && day.isToday"
          [class.bg-surface-container-low]="!day.isActive && !day.isToday"
        >
          <div class="flex items-center justify-between pb-2 border-b border-outline-variant/10">
            <div class="flex items-center gap-2">
              <span
                class="text-xxs font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all"
                [class.bg-primary]="day.isToday"
                [class.text-on-primary-fixed]="day.isToday"
                [class.bg-surface-container]="!day.isToday"
                [class.text-on-surface-variant]="!day.isToday"
              >
                {{ day.dayName }}
              </span>
              <span class="title-lg font-black text-white">
                {{ day.dayNumber }}
              </span>
              @if (day.isToday) {
                <span class="text-xxs font-black tracking-widest text-primary uppercase ml-1">
                  {{ 'roster.today' | translate }}
                </span>
              }
            </div>

            @if (currentUserRole() === 'OWNER') {
              <button
                mat-icon-button
                (click)="quickCreate.emit(day.date)"
                title="{{ 'common.create' | translate }}"
              >
                <mat-icon style="font-size: 16px; width: 16px; height: 16px;">add</mat-icon>
              </button>
            }
          </div>

          <div class="flex flex-col gap-2">
            @for (shift of day.shifts; track shift.id) {
              <div
                class="flex items-center gap-3 bg-surface-container/40 p-3 rounded-2xl border border-outline-variant/5"
              >
                <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  <img [src]="shift.userImage" alt="Staff Portrait" class="w-full h-full object-cover" />
                </div>
                <div class="flex flex-col flex-1 min-w-0">
                  <span class="text-xs font-bold text-primary uppercase tracking-wide leading-none mb-1">
                    {{ shift.timeRange }}
                  </span>
                  <span class="text-sm font-bold text-white truncate">
                    {{ shift.userName || ('roster.unassigned' | translate) }}
                  </span>
                </div>
                @if (shift.isOwn) {
                  <span
                    class="text-xxs font-black text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full border border-tertiary/10 uppercase"
                  >
                    {{ 'roster.exchanges.your_request' | translate }}
                  </span>
                }
                @if (shift.hasPendingExchange) {
                  <span
                    class="text-xxs font-black text-secondary bg-secondary/10 px-2 py-0.5 rounded-full border border-secondary/10 uppercase"
                  >
                    {{ 'roster.exchange_pending' | translate }}
                  </span>
                }
                @if (currentUserRole() === 'OWNER') {
                  <button
                    mat-icon-button
                    color="warn"
                    [disabled]="isSubmitting()"
                    (click)="deleteShift.emit(shift)"
                    class="shrink-0"
                  >
                    <mat-icon style="font-size: 14px; width: 14px; height: 14px;">delete</mat-icon>
                  </button>
                }
              </div>
            } @empty {
              <p class="text-xs text-on-surface-variant/40 italic py-2 text-center">
                {{ 'roster.no_shifts' | translate }}
              </p>
            }
          </div>
        </div>
      }
    </div>
  `,
  })
export class RosterWeeklyGrid {
  readonly weekDays = input.required<WeeklyDayItem[]>();
  readonly currentUserRole = input.required<string | undefined>();
  readonly isSubmitting = input<boolean>(false);

  readonly quickCreate = output<Date>();
  readonly deleteShift = output<WeeklyShiftItem>();
  readonly replicatePreviousWeek = output<void>();
}
