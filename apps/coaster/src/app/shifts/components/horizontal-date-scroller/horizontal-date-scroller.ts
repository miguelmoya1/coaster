import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';

export interface ScrollerDay {
  dayName: string;
  dayNumber: number;
  isActive: boolean;
}

@Component({
  selector: 'coaster-horizontal-date-scroller',
  imports: [Listbox, Option],
  template: `
    <div
      [attr.aria-disabled]="disabled()"
      [class.opacity-50]="disabled()"
      [class.pointer-events-none]="disabled()"
      ngListbox
      orientation="horizontal"
      class="flex gap-3 overflow-x-auto hide-scrollbar py-2 -mx-4 px-4 outline-none"
    >
      @for (day of days(); track day.dayNumber) {
        @if (day.isActive) {
          <div
            ngOption
            [value]="day.dayNumber"
            (click)="daySelected.emit(day.dayNumber)"
            (keydown.enter)="daySelected.emit(day.dayNumber)"
            tabindex="0"
            class="shrink-0 w-16 h-24 rounded-2xl bg-primary-container text-on-primary-fixed flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary/20 scale-105 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span class="label-sm font-black uppercase">{{ day.dayName }}</span>
            <span class="display-sm font-black tracking-tight">{{ day.dayNumber }}</span>
          </div>
        } @else {
          <div
            ngOption
            [value]="day.dayNumber"
            (click)="daySelected.emit(day.dayNumber)"
            (keydown.enter)="daySelected.emit(day.dayNumber)"
            tabindex="0"
            class="shrink-0 w-16 h-24 rounded-2xl bg-surface-container-low flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span class="label-sm text-on-surface-variant font-bold uppercase">{{ day.dayName }}</span>
            <span class="display-sm font-bold tracking-tight">{{ day.dayNumber }}</span>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorizontalDateScroller {
  readonly days = input<ScrollerDay[]>([]);
  readonly selectedDay = input<number>();
  readonly daySelected = output<number>();
  readonly disabled = input(false);
}
