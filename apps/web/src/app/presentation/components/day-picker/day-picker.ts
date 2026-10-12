import { Component, computed, input, output } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { calendarDateOf, dateOfCalendarDate, shiftCalendarDate } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-day-picker',
  imports: [MatButton, MatIconButton, MatIcon, MatDatepicker, MatDatepickerInput, MatDatepickerToggle, TranslatePipe],
  providers: [provideNativeDateAdapter()],
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex items-center justify-between bg-surface-container rounded-2xl p-3 gap-2">
      <button
        mat-icon-button
        data-testid="previous-day-btn"
        [attr.aria-label]="'components.day_picker.previous_day' | translate"
        (click)="shift(-1)"
      >
        <mat-icon class="text-[20px]! w-[20px]! h-[20px]! leading-[20px]! m-0!">chevron_left</mat-icon>
      </button>

      <div class="flex items-center gap-2 flex-1 justify-center">
        <input
          [matDatepicker]="datePicker"
          class="bg-transparent text-on-surface font-bold text-center outline-none cursor-pointer border-none"
          [value]="selected()"
          [max]="max()"
          (dateChange)="pick($event.value)"
        />
        <mat-datepicker-toggle [for]="datePicker" class="text-primary" />
        <mat-datepicker #datePicker />
      </div>

      <button
        mat-icon-button
        data-testid="next-day-btn"
        [attr.aria-label]="'components.day_picker.next_day' | translate"
        [disabled]="isToday()"
        (click)="shift(1)"
      >
        <mat-icon class="text-[20px]! w-[20px]! h-[20px]! leading-[20px]! m-0!">chevron_right</mat-icon>
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button mat-stroked-button class="w-full" data-testid="today-btn" (click)="dateChange.emit(today())">
        {{ 'components.day_picker.today' | translate }}
      </button>
      <button mat-stroked-button class="w-full" data-testid="yesterday-btn" (click)="dateChange.emit(yesterday())">
        {{ 'components.day_picker.yesterday' | translate }}
      </button>
    </div>
  `,
})
export class DayPicker {
  public readonly date = input.required<string>();
  public readonly today = input.required<string>();
  public readonly dateChange = output<string>();

  protected readonly selected = computed(() => dateOfCalendarDate(this.date()));
  protected readonly max = computed(() => dateOfCalendarDate(this.today()));
  protected readonly yesterday = computed(() => shiftCalendarDate(this.today(), -1));
  protected readonly isToday = computed(() => this.date() >= this.today());

  protected pick(date: Date | null) {
    if (date) {
      this.dateChange.emit(calendarDateOf(date));
    }
  }

  protected shift(days: number) {
    this.dateChange.emit(shiftCalendarDate(this.date(), days));
  }
}
