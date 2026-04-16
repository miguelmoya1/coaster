import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { BarId } from '@coaster/interfaces';
import { format } from 'date-fns';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { prepareDefaultProfileImage } from '../../../../core';
import { CoasterTitle, Fab, Loading } from '../../../../shared';
import { BarShifts, HorizontalDateScroller, ShiftCard } from '../../../../shifts';
import { RosterStateService } from '../../../../roster';

@Component({
  selector: 'coaster-roster',
  imports: [Loading, Fab, HorizontalDateScroller, ShiftCard, CoasterTitle, NgIcon, TranslatePipe],
  providers: [RosterStateService],
  viewProviders: [provideIcons({ lucideClock })],
  host: {
    class: 'flex flex-col gap-2 relative h-full',
  },
  template: `
    <div class="flex items-center justify-between mb-4 mt-2">
      <div class="flex flex-col gap-0.5">
        <span class="text-on-surface-variant font-bold uppercase tracking-widest text-sm">{{
          state.displayMonthYear()
        }}</span>
        <h1 coaster-title>{{ 'roster.title' | translate }}</h1>
      </div>

      <div class="flex flex-col items-end gap-0.5 opacity-80">
        <span class="text-on-surface-variant font-bold uppercase tracking-widest text-xs">{{
          'roster.today' | translate
        }}</span>
        <span class="text-white font-bold text-sm">{{ state.displayToday() }}</span>
      </div>
    </div>

    <coaster-horizontal-date-scroller
      [days]="state.scrollerDays()"
      [selectedDay]="state.selectedDate().getDate()"
      (daySelected)="onDaySelected($event)"
      class="mb-6"
    />

    <h2 coaster-title class="mb-4 flex items-center gap-2 text-on-surface">
      <ng-icon name="lucideClock" class="text-primary text-xl" />
      {{ 'roster.daily_assignments' | translate }}
    </h2>

    @if (list.isLoading()) {
      <coaster-loading />
    } @else {
      <div class="flex flex-col gap-3 pb-24">
        @if (list.hasValue() && list.value().length) {
          @for (shift of list.value(); track shift.id) {
            <coaster-shift-card
              [timeRange]="formatTimeRange(shift.startTime, shift.endTime)"
              [staffName]="shift.user?.name ?? ('roster.unassigned' | translate)"
              [roleName]="shift.user ? 'STAFF' : 'N/A'"
              [staffImage]="getProfileImage(shift.user?.name)"
              roleColorClass="bg-primary text-primary"
            />
          }
        } @else {
          <div class="text-center py-10 opacity-50 text-white font-bold my-auto">
            {{ 'roster.no_shifts' | translate }}
          </div>
        }
      </div>
    }

    <coaster-fab />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Roster {
  public readonly barId = input.required<BarId>();

  protected readonly state = inject(RosterStateService);
  protected readonly barShifts = inject(BarShifts);
  protected readonly translate = inject(TranslateService);

  protected readonly list = this.barShifts.all;

  constructor() {
    effect(() => {
      this.barShifts.setContext(this.barId());
    });

    effect(() => {
      const range = this.state.dailyShiftsRange();
      this.barShifts.setDateRange(range.startIso, range.endIso);
    });
  }

  protected onDaySelected(dayNumber: number) {
    this.state.selectDay(dayNumber);
  }

  protected formatTimeRange(startIso: string, endIso: string): string {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      return `${format(start, 'HH:mm')} — ${format(end, 'HH:mm')}`;
    } catch {
      return '';
    }
  }

  protected getProfileImage(name?: string) {
    return prepareDefaultProfileImage(undefined, name ?? this.translate.instant('roster.unassigned'));
  }
}
