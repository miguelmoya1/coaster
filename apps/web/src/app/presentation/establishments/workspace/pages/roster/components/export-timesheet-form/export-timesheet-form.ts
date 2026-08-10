import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatDateRangeInput,
  MatDateRangePicker,
  MatDatepickerToggle,
  MatEndDate,
  MatStartDate,
} from '@angular/material/datepicker';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { DateFormatterService } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-export-timesheet-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatFormField,
    MatLabel,
    MatSuffix,
    MatDateRangeInput,
    MatDateRangePicker,
    MatDatepickerToggle,
    MatStartDate,
    MatEndDate,
    MatButton,
    TranslatePipe,
  ],
  template: `
    <div class="mb-4 pb-4 border-b border-outline-variant/15 select-none">
      <h3 class="text-white text-lg font-black uppercase tracking-tight">
        {{ 'roster.time_tracking.export_title' | translate }}
      </h3>
      <span class="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
        {{ 'roster.time_tracking.export_hint' | translate }}
      </span>
    </div>

    <mat-form-field appearance="outline" class="w-full">
      <mat-label>{{ 'roster.time_tracking.export_range' | translate }}</mat-label>
      <mat-date-range-input [rangePicker]="picker" [max]="today">
        <input
          matStartDate
          [value]="start()"
          [placeholder]="'roster.time_tracking.export_from' | translate"
          (dateChange)="start.set($event.value)"
        />
        <input
          matEndDate
          [value]="end()"
          [placeholder]="'roster.time_tracking.export_to' | translate"
          (dateChange)="end.set($event.value)"
        />
      </mat-date-range-input>
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-date-range-picker #picker />
    </mat-form-field>

    <div class="flex justify-end mt-4 gap-2">
      <button mat-stroked-button class="w-full" type="button" (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>

      <button mat-flat-button class="w-full" type="button" [disabled]="!isRangeComplete()" (click)="emitRange()">
        {{ 'roster.time_tracking.export' | translate }}
      </button>
    </div>
  `,
})
export class ExportTimesheetForm {
  readonly #dateFormatter = inject(DateFormatterService);

  public readonly from = input.required<string>();
  public readonly to = input.required<string>();

  public readonly canceled = output<void>();
  public readonly confirmed = output<{ from: string; to: string }>();

  protected readonly today = new Date();

  protected readonly start = linkedSignal<Date | null>(() => new Date(`${this.from()}T00:00:00`));
  protected readonly end = linkedSignal<Date | null>(() => new Date(`${this.to()}T00:00:00`));

  protected readonly isRangeComplete = computed(() => this.start() !== null && this.end() !== null);

  protected emitRange() {
    const start = this.start();
    const end = this.end();

    if (!start || !end) {
      return;
    }

    this.confirmed.emit({
      from: this.#dateFormatter.formatDayId(start),
      to: this.#dateFormatter.formatDayId(end),
    });
  }
}
