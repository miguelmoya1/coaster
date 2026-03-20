import { Component, ChangeDetectionStrategy, input } from '@angular/core';

export interface ScrollerDay {
  dayName: string;
  dayNumber: number;
  isActive: boolean;
}

@Component({
  selector: 'coaster-horizontal-date-scroller',
  template: `
    <div class="flex gap-3 overflow-x-auto hide-scrollbar py-2 -mx-4 px-4">
      @for (day of days(); track day.dayNumber) {
        @if (day.isActive) {
          <div class="shrink-0 w-16 h-24 rounded-2xl bg-primary-container text-on-primary-fixed flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 scale-105 cursor-pointer">
            <span class="label-sm font-black uppercase">{{day.dayName}}</span>
            <span class="display-sm font-black tracking-tight">{{day.dayNumber}}</span>
          </div>
        } @else {
          <div class="shrink-0 w-16 h-24 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-colors cursor-pointer">
            <span class="label-sm text-on-surface-variant font-bold uppercase">{{day.dayName}}</span>
            <span class="display-sm font-bold tracking-tight">{{day.dayNumber}}</span>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HorizontalDateScrollerComponent {
  readonly days = input<ScrollerDay[]>([]);
}
