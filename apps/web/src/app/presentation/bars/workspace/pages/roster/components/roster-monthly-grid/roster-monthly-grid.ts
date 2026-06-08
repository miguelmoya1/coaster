import { SlicePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { ShiftId } from '@coaster/common';

export interface MonthlyShiftItem {
  id: ShiftId;
  userName?: string;
  isOwn: boolean;
  hasPendingExchange: boolean;
}

export interface MonthlyDayItem {
  date: Date;
  id: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isActive: boolean;
  shifts: MonthlyShiftItem[];
}

@Component({
  selector: 'coaster-roster-monthly-grid',
  imports: [TranslatePipe, SlicePipe],
  template: `
    <div class="border border-outline-variant/10 bg-surface-container-low rounded-3xl p-4 flex flex-col gap-4">
      <!-- Weekday Headers -->
      <div class="grid grid-cols-7 text-center border-b border-outline-variant/10 pb-2">
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.lun' | translate }}</span>
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.mar' | translate }}</span>
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.mie' | translate }}</span>
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.jue' | translate }}</span>
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.vie' | translate }}</span>
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.sab' | translate }}</span>
        <span class="text-xxs font-black text-on-surface-variant uppercase">{{ 'roster.days.dom' | translate }}</span>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1 sm:gap-2">
        @for (day of calendarDays(); track day.id) {
          <div
            (click)="daySelected.emit(day.id)"
            (keydown.enter)="daySelected.emit(day.id)"
            (keydown.space)="daySelected.emit(day.id); $event.preventDefault()"
            role="button"
            tabindex="0"
            class="min-h-16 sm:min-h-24 p-1.5 sm:p-2 rounded-2xl flex flex-col gap-1 cursor-pointer transition-all border outline-none select-none relative group"
            [class.bg-surface-container-high]="day.isActive"
            [class.border-primary/45]="day.isActive"
            [class.bg-surface-container/30]="!day.isCurrentMonth"
            [class.opacity-30]="!day.isCurrentMonth"
            [class.bg-surface-container/80]="day.isCurrentMonth && !day.isActive"
            [class.border-outline-variant/10]="!day.isActive"
            [class.hover:bg-surface-container]="!day.isActive && day.isCurrentMonth"
            [class.hover:border-outline-variant/35]="!day.isActive && day.isCurrentMonth"
            [class.hover:scale-102]="day.isCurrentMonth"
          >
            <!-- Day Number -->
            <span
              class="text-xs font-black self-end rounded-full h-5 w-5 flex items-center justify-center transition-colors"
              [class.bg-primary]="day.isActive"
              [class.text-on-primary-fixed]="day.isActive"
              [class.text-white]="!day.isActive && day.isCurrentMonth"
              [class.text-on-surface-variant]="!day.isActive && !day.isCurrentMonth"
            >
              {{ day.dayNumber }}
            </span>

            <!-- Compact Shift Indicators -->
            <div class="flex-1 flex flex-col gap-0.5 overflow-hidden justify-end">
              <!-- Desktop / Tablet list -->
              <div class="hidden sm:flex flex-col gap-1">
                @for (shift of day.shifts.slice(0, 3); track shift.id) {
                  <div
                    class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md truncate max-w-full flex items-center gap-1 border transition-all"
                    [class.bg-primary/10]="!shift.isOwn"
                    [class.text-primary]="!shift.isOwn"
                    [class.border-primary/20]="!shift.isOwn"
                    [class.bg-tertiary/10]="shift.isOwn"
                    [class.text-tertiary]="shift.isOwn"
                    [class.border-tertiary/20]="shift.isOwn"
                  >
                    <span
                      class="w-1.5 h-1.5 rounded-full"
                      [class.bg-primary]="!shift.isOwn"
                      [class.bg-tertiary]="shift.isOwn"
                    ></span>
                    {{
                      shift.userName
                        ? (shift.userName.split(' ')[0] | slice: 0 : 6)
                        : ('roster.unassigned' | translate)
                    }}
                  </div>
                }
                @if (day.shifts.length > 3) {
                  <span class="text-[8px] font-black text-on-surface-variant/60 pl-1"> +{{ day.shifts.length - 3 }} </span>
                }
              </div>

              <!-- Mobile dots -->
              <div class="flex sm:hidden gap-0.5 justify-center flex-wrap mt-auto">
                @for (shift of day.shifts; track shift.id) {
                  <span
                    class="w-1.5 h-1.5 rounded-full shrink-0"
                    [class.bg-primary]="!shift.isOwn && !shift.hasPendingExchange"
                    [class.bg-tertiary]="shift.isOwn"
                    [class.bg-secondary]="shift.hasPendingExchange"
                  ></span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  })
export class RosterMonthlyGrid {
  readonly calendarDays = input.required<MonthlyDayItem[]>();
  readonly daySelected = output<string>();
}
