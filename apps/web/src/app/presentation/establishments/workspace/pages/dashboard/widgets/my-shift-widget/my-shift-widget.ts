import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { EstablishmentId, Workday } from '@coaster/common';
import { ClockState, TimeEntryType } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { clockStateOf, ManageTimeEntries } from '@coaster/time-tracking';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { Spinner } from '../../../../../../components/spinner/spinner';

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'coaster-my-shift-widget',
  imports: [TranslatePipe, MatIcon, MatButton, MatCard, RouterLink, Spinner],
  host: { class: 'block' },
  templateUrl: './my-shift-widget.html',
})
export class MyShiftWidget {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly myWorkdays = input.required<PageResource<Workday[]>>();
  public readonly runningWorkday = input.required<PageResource<Workday | null>>();

  readonly #manageTimeEntries = inject(ManageTimeEntries);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);

  readonly isSubmitting = signal(false);

  readonly ClockState = ClockState;
  readonly TimeEntryType = TimeEntryType;

  readonly #workdays = computed<Workday[]>(() => loadedOr(this.myWorkdays(), []));

  readonly isLoading = computed(() => this.myWorkdays().isLoading());

  readonly today = computed(() => {
    const todayId = format(new Date(), 'yyyy-MM-dd');
    return this.#workdays().find((workday) => workday.date === todayId);
  });

  readonly clockState = computed(() => clockStateOf(loadedOr(this.runningWorkday(), null)));

  readonly clockStateLabelKey = computed(() => `schedule.time_tracking.state_${this.clockState().toLowerCase()}`);

  readonly todayPlannedRange = computed(() => {
    const workday = this.today();
    if (!workday?.plannedStart || !workday?.plannedEnd) {
      return null;
    }
    return `${formatTime(workday.plannedStart)} — ${formatTime(workday.plannedEnd)}`;
  });

  readonly todayWorkedLabel = computed(() => this.#toHoursLabel(this.today()?.workedMinutes ?? 0));

  readonly weekWorkedLabel = computed(() =>
    this.#toHoursLabel(this.#workdays().reduce((total, workday) => total + workday.workedMinutes, 0)),
  );

  readonly upcoming = computed(() => {
    const todayId = format(new Date(), 'yyyy-MM-dd');

    return this.#workdays()
      .filter((workday) => workday.date > todayId && !!workday.plannedStart && !!workday.plannedEnd)
      .slice(0, 3)
      .map((workday) => ({
        date: workday.date,
        dayLabel: this.#toDayLabel(workday.date),
        timeRange: `${formatTime(workday.plannedStart as string)} — ${formatTime(workday.plannedEnd as string)}`,
      }));
  });

  async clock(type: TimeEntryType): Promise<void> {
    if (this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      await this.#manageTimeEntries.clock(this.establishmentId(), type);
      this.#feedback.success(this.#translate.instant('schedule.time_tracking.clock_saved'));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.myWorkdays().reload();
      this.runningWorkday().reload();
      this.isSubmitting.set(false);
    }
  }

  #toHoursLabel(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours}h ${String(rest).padStart(2, '0')}m`;
  }

  #toDayLabel(date: string): string {
    const label = new Date(`${date}T00:00:00`).toLocaleDateString(navigator.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
