import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ClockState, TimeEntryType } from '@coaster/common';
import { DateFormatterService } from '@coaster/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-clock-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon, TranslatePipe],
  host: { class: 'block' },
  template: `
    <section
      class="flex flex-col gap-4 rounded-2xl border border-outline-variant/20 bg-surface-container p-4"
      [attr.aria-label]="'schedule.time_tracking.title' | translate"
    >
      <div class="flex items-center gap-3">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider"
          [class]="stateClass()"
          aria-live="polite"
        >
          <mat-icon class="text-[16px]! w-[16px]! h-[16px]! leading-[16px]!">{{ stateIcon() }}</mat-icon>
          {{ stateLabel() | translate }}
        </span>

        <div class="ml-auto flex items-center gap-4 text-right">
          <div class="flex flex-col">
            <span class="text-xxs font-bold uppercase tracking-wider text-on-surface-variant">
              {{ 'schedule.time_tracking.worked' | translate }}
            </span>
            <span class="text-primary text-xl font-black tracking-tighter">{{ workedLabel() }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-xxs font-bold uppercase tracking-wider text-on-surface-variant">
              {{ 'schedule.time_tracking.break' | translate }}
            </span>
            <span class="text-on-surface text-xl font-black tracking-tighter">{{ breakLabel() }}</span>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        @if (state() === ClockState.OUT) {
          <button mat-flat-button class="flex-1" [disabled]="disabled()" (click)="clock.emit(TimeEntryType.CLOCK_IN)">
            <mat-icon>login</mat-icon>
            {{ 'schedule.time_tracking.clock_in' | translate }}
          </button>
        }

        @if (state() === ClockState.IN) {
          <button
            mat-stroked-button
            class="flex-1"
            [disabled]="disabled()"
            (click)="clock.emit(TimeEntryType.BREAK_START)"
          >
            <mat-icon>free_breakfast</mat-icon>
            {{ 'schedule.time_tracking.break_start' | translate }}
          </button>
        }

        @if (state() === ClockState.ON_BREAK) {
          <button
            mat-stroked-button
            class="flex-1"
            [disabled]="disabled()"
            (click)="clock.emit(TimeEntryType.BREAK_END)"
          >
            <mat-icon>play_arrow</mat-icon>
            {{ 'schedule.time_tracking.break_end' | translate }}
          </button>
        }

        @if (state() !== ClockState.OUT) {
          <button mat-flat-button class="flex-1" [disabled]="disabled()" (click)="clock.emit(TimeEntryType.CLOCK_OUT)">
            <mat-icon>logout</mat-icon>
            {{ 'schedule.time_tracking.clock_out' | translate }}
          </button>
        }
      </div>
    </section>
  `,
})
export class ClockCard {
  readonly #dateFormatter = inject(DateFormatterService);

  protected readonly ClockState = ClockState;
  protected readonly TimeEntryType = TimeEntryType;

  public readonly state = input.required<ClockState>();
  public readonly workedMinutes = input(0);
  public readonly breakMinutes = input(0);
  public readonly disabled = input(false);

  public readonly clock = output<TimeEntryType>();

  protected readonly workedLabel = computed(() => this.#dateFormatter.formatDuration(this.workedMinutes()));
  protected readonly breakLabel = computed(() => this.#dateFormatter.formatDuration(this.breakMinutes()));

  protected readonly stateLabel = computed(() => `schedule.time_tracking.state_${this.state().toLowerCase()}`);

  protected readonly stateIcon = computed(() => {
    if (this.state() === ClockState.IN) {
      return 'work';
    }

    return this.state() === ClockState.ON_BREAK ? 'free_breakfast' : 'schedule';
  });

  protected readonly stateClass = computed(() => {
    if (this.state() === ClockState.IN) {
      return 'bg-primary/15 text-primary';
    }

    return this.state() === ClockState.ON_BREAK
      ? 'bg-tertiary/15 text-tertiary'
      : 'bg-surface-container-highest text-on-surface-variant';
  });
}
