import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { Field } from '../../../../../../components/field/field';
import { CoasterInput } from '../../../../../../components/field/input.directive';

@Component({
  selector: 'coaster-export-timesheet-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, TranslatePipe, Field, CoasterInput],
  host: {
    class: 'block',
  },
  template: `
    <div class="mb-4 pb-4 border-b border-outline-variant/15 select-none">
      <h3 class="text-white text-lg font-black uppercase tracking-tight">
        {{ 'schedule.time_tracking.export_title' | translate }}
      </h3>
      <span class="text-on-surface-variant font-bold text-xs uppercase tracking-wider">
        {{ 'schedule.time_tracking.export_hint' | translate }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <coaster-field [label]="'schedule.time_tracking.export_from' | translate">
        <input coasterInput type="date" [max]="today" [value]="start()" (change)="start.set(pick($event))" />
      </coaster-field>

      <coaster-field [label]="'schedule.time_tracking.export_to' | translate">
        <input coasterInput type="date" [max]="today" [value]="end()" (change)="end.set(pick($event))" />
      </coaster-field>
    </div>

    <div class="flex justify-end mt-4 gap-2">
      <button mat-stroked-button class="w-full" type="button" (click)="canceled.emit()">
        {{ 'common.cancel' | translate }}
      </button>

      <button mat-flat-button class="w-full" type="button" [disabled]="!isRangeComplete()" (click)="emitRange()">
        {{ 'schedule.time_tracking.export' | translate }}
      </button>
    </div>
  `,
})
export class ExportTimesheetForm {
  public readonly from = input.required<string>();
  public readonly to = input.required<string>();

  public readonly canceled = output<void>();
  public readonly confirmed = output<{ from: string; to: string }>();

  protected readonly today = new Date().toISOString().slice(0, 10);

  protected readonly start = linkedSignal(() => this.from());
  protected readonly end = linkedSignal(() => this.to());

  protected readonly isRangeComplete = computed(() => !!this.start() && !!this.end());

  protected pick(event: Event) {
    return (event.target as HTMLInputElement).value;
  }

  protected emitRange() {
    if (!this.isRangeComplete()) {
      return;
    }

    this.confirmed.emit({ from: this.start(), to: this.end() });
  }
}
