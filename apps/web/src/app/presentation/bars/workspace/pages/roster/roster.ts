import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, TemplateRef, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, createUrlTreeFromSnapshot, isActive, Router, RouterLink } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, BarRole, Shift, ShiftExchange, ShiftExchangeId, ShiftId } from '@coaster/common';
import { DateFormatterService } from '@coaster/core';
import { ExchangesStore } from '@coaster/exchanges';
import { MembersStore } from '@coaster/members';
import { RosterStateService } from '@coaster/roster';
import { ShiftsStore } from '@coaster/shifts';
import { TranslatePipe } from '@ngx-translate/core';
import { addDays, endOfWeek, isSameDay, startOfWeek, subWeeks } from 'date-fns';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialogComponent } from '../../../../components/confirm-dialog/confirm-dialog.component';
import { Loading } from '../../../../components/loading/loading';
import { BottomSheet } from '../../components/bottom-sheet/bottom-sheet';
import { Fab } from '../../components/fab/fab';
import { CreateShiftForm } from './components/create-shift-form/create-shift-form';
import { ExchangeRequestCard } from './components/exchange-request-card/exchange-request-card';
import { RosterMonthlyGrid } from './components/roster-monthly-grid/roster-monthly-grid';
import { RosterNavigation } from './components/roster-navigation/roster-navigation';
import { RosterWeeklyGrid } from './components/roster-weekly-grid/roster-weekly-grid';
import { ShiftCard } from './components/shift-card/shift-card';

export type DailyShiftItem = Shift & {
  timeRange: string;
  roleName: BarRole;
  hasPendingExchange: boolean;
  isOwn: boolean;
  isPast: boolean;
};

export type PendingExchangeItem = ShiftExchange & {
  month: string;
  day: string;
  shiftPeriod: string;
  timeRange: string;
  roleName: BarRole;
  isOwnRequest: boolean;
};

@Component({
  selector: 'coaster-roster',
  imports: [
    Loading,
    Fab,
    ShiftCard,
    TranslatePipe,
    BottomSheet,
    CreateShiftForm,
    ConfirmDialogComponent,
    ExchangeRequestCard,
    RouterLink,
    RosterNavigation,
    RosterWeeklyGrid,
    RosterMonthlyGrid,
    MatIcon,
  ],
  providers: [RosterStateService],
  host: {
    class: 'flex flex-col gap-2 relative',
  },
  templateUrl: './roster.html',
})
export default class Roster {
  public readonly barId = input.required<BarId>();
  public readonly date = input<string>();
  public readonly view = input<'day' | 'week' | 'month'>();

  readonly #state = inject(RosterStateService);
  readonly #shiftsStore = inject(ShiftsStore);
  readonly #dateFormatter = inject(DateFormatterService);
  readonly #membersStore = inject(MembersStore);
  readonly #barsStore = inject(BarsStore);
  readonly #exchangesStore = inject(ExchangesStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #http = inject(HttpClient);
  readonly #dialog = inject(MatDialog);

  protected readonly deleteShiftDialogRef = viewChild.required<TemplateRef<unknown>>('deleteShiftDialog');
  protected readonly deleteExchangeDialogRef = viewChild.required<TemplateRef<unknown>>('deleteExchangeDialog');
  protected readonly replicateWeekDialogRef = viewChild.required<TemplateRef<unknown>>('replicateWeekDialog');

  readonly shifts = this.#shiftsStore.shifts;
  readonly pendingExchanges = this.#exchangesStore.exchanges;
  readonly displayMonthYear = this.#state.displayMonthYear;
  readonly displaySelectedDate = computed(() => {
    return this.#dateFormatter.formatShortDate(this.#state.selectedDate());
  });
  readonly displayToday = this.#state.displayToday;
  readonly scrollerDays = this.#state.scrollerDays;
  readonly viewMode = this.#state.viewMode;

  readonly isSubmitting = signal(false);
  protected readonly showReplicateConfirm = signal(false);

  protected readonly shiftDeleting = signal<DailyShiftItem | null>(null);
  protected readonly exchangeDeleting = signal<PendingExchangeItem | null>(null);

  readonly isCreateMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['new']),
    this.#router,
  );

  readonly membersList = computed(() => {
    if (!this.#membersStore.list.hasValue()) {
      return [];
    }
    return this.#membersStore.list.value() ?? [];
  });

  readonly currentUserId = computed(() => {
    if (!this.#barsStore.myMember.hasValue()) {
      return undefined;
    }
    return this.#barsStore.myMember.value()?.userId;
  });

  readonly selectedDayId = computed(() => this.#dateFormatter.formatDayId(this.#state.selectedDate()));

  readonly currentUserRole = computed(() => {
    if (!this.#barsStore.myMember.hasValue()) {
      return undefined;
    }
    return this.#barsStore.myMember.value()?.role;
  });

  readonly pendingShiftIds = computed(() => {
    if (!this.pendingExchanges.hasValue()) {
      return new Set<string>();
    }

    const exchanges = this.pendingExchanges.value();
    return new Set(exchanges.map((e) => e.shiftId));
  });

  readonly dailyShifts = computed(() => {
    if (!this.shifts.hasValue()) {
      return [];
    }

    const now = new Date();
    const selectedId = this.selectedDayId();

    return this.shifts
      .value()
      .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === selectedId)
      .map((shift) => ({
        ...shift,
        timeRange: this.#dateFormatter.formatTimeRange(shift.startTime, shift.endTime),
        roleName: 'STAFF' as BarRole,
        hasPendingExchange: this.pendingShiftIds().has(shift.id),
        isOwn: shift.userId === this.currentUserId(),
        isPast: new Date(shift.startTime) < now,
      }));
  });

  readonly weekViewDays = computed(() => {
    if (!this.shifts.hasValue()) {
      return [];
    }

    const now = new Date();
    const shiftsList = this.shifts.value();

    return this.#state.activeWeekDays().map((date) => {
      const dayId = this.#dateFormatter.formatDayId(date);
      const dayShifts = shiftsList
        .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === dayId)
        .map((shift) => ({
          ...shift,
          timeRange: this.#dateFormatter.formatTimeRange(shift.startTime, shift.endTime),
          roleName: 'STAFF' as BarRole,
          hasPendingExchange: this.pendingShiftIds().has(shift.id),
          isOwn: shift.userId === this.currentUserId(),
          isPast: new Date(shift.startTime) < now,
        }));

      return {
        date,
        dayId,
        dayName: this.#dateFormatter.formatDayName(date),
        dayNumber: date.getDate(),
        shifts: dayShifts,
        isToday: isSameDay(date, new Date()),
        isActive: isSameDay(date, this.#state.selectedDate()),
      };
    });
  });

  readonly calendarMonthDaysWithShifts = computed(() => {
    if (!this.shifts.hasValue()) {
      return [];
    }

    const now = new Date();
    const shiftsList = this.shifts.value();

    return this.#state.calendarMonthDays().map((day) => {
      const dayShifts = shiftsList
        .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === day.id)
        .map((shift) => ({
          ...shift,
          timeRange: this.#dateFormatter.formatTimeRange(shift.startTime, shift.endTime),
          roleName: 'STAFF' as BarRole,
          hasPendingExchange: this.pendingShiftIds().has(shift.id),
          isOwn: shift.userId === this.currentUserId(),
          isPast: new Date(shift.startTime) < now,
        }));

      return {
        ...day,
        shifts: dayShifts,
      };
    });
  });

  readonly pendingExchangesList = computed(() => {
    if (!this.pendingExchanges.hasValue()) {
      return [];
    }

    return this.pendingExchanges.value().map((exchange) => ({
      ...exchange,
      month: this.#dateFormatter.formatMonth(exchange.shiftStartTime),
      day: this.#dateFormatter.formatDay(exchange.shiftStartTime),
      shiftPeriod: 'roster.exchanges.period_' + this.#dateFormatter.formatShiftPeriod(exchange.shiftStartTime),
      timeRange: this.#dateFormatter.formatTimeRange(exchange.shiftStartTime, exchange.shiftEndTime),
      roleName: 'STAFF' as BarRole,
      isOwnRequest: exchange.requesterId === this.currentUserId(),
    }));
  });

  constructor() {
    effect(() => {
      const d = this.date();
      if (d) {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          this.#state.setDate(parsed);
        }
      }
    });

    effect(() => {
      const v = this.view();
      if (v) {
        this.#state.setViewMode(v);
      }
    });

    effect(() => {
      const range = this.#state.dailyShiftsRange();
      this.#shiftsStore.setDateRange(range.startIso, range.endIso);
    });

    effect(() => {
      const barId = this.barId();

      this.#exchangesStore.setBarId(barId);
      this.#shiftsStore.setBarId(barId);
      this.#membersStore.setBarId(barId);
    });
  }

  #updateQueryParams(date: Date, view: 'day' | 'week' | 'month') {
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        date: this.#dateFormatter.formatDayId(date),
        view: view,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected handleDaySelected(dayId: string) {
    const parsed = new Date(dayId);
    if (!isNaN(parsed.getTime())) {
      this.#updateQueryParams(parsed, 'day');
    }
  }

  protected handleCloseModal() {
    this.#router.navigate(['/bars', this.barId(), 'roster'], {
      queryParams: {
        date: this.#dateFormatter.formatDayId(this.#state.selectedDate()),
        view: this.viewMode(),
      },
    });
  }

  protected handleCreateShift() {
    this.#exchangesStore.reload();
    this.handleCloseModal();
  }

  protected async handleAcceptExchange(exchangeId: ShiftExchangeId) {
    this.isSubmitting.set(true);

    const error = await this.#exchangesStore.accept(exchangeId);
    if (error) {
      this.isSubmitting.set(false);
      return;
    }

    this.#shiftsStore.reload();
    this.#exchangesStore.reload();
    this.isSubmitting.set(false);
  }

  protected async handleOfferExchange(shiftId: ShiftId) {
    this.isSubmitting.set(true);

    const error = await this.#exchangesStore.request(shiftId, {});
    if (error) {
      this.isSubmitting.set(false);
      return;
    }

    this.#shiftsStore.reload();
    this.#exchangesStore.reload();
    this.isSubmitting.set(false);
  }

  protected handleClickDeleteShift(shift: DailyShiftItem) {
    this.shiftDeleting.set(shift);
    const dialogRef = this.#dialog.open(this.deleteShiftDialogRef());
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.handleConfirmDeleteShift();
      } else {
        this.handleCancelDeleteShift();
      }
    });
  }

  protected handleCancelDeleteShift() {
    this.shiftDeleting.set(null);
  }

  protected async handleConfirmDeleteShift() {
    const shift = this.shiftDeleting();
    if (!shift) return;

    this.isSubmitting.set(true);
    const error = await this.#shiftsStore.delete(shift.id);
    if (!error) {
      this.shiftDeleting.set(null);
      this.#exchangesStore.reload();
    }
    this.isSubmitting.set(false);
  }

  protected handleClickDeleteExchange(exchange: PendingExchangeItem) {
    this.exchangeDeleting.set(exchange);
    const dialogRef = this.#dialog.open(this.deleteExchangeDialogRef());
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.handleConfirmDeleteExchange();
      } else {
        this.handleCancelDeleteExchange();
      }
    });
  }

  protected handleCancelDeleteExchange() {
    this.exchangeDeleting.set(null);
  }

  protected async handleConfirmDeleteExchange() {
    const exchange = this.exchangeDeleting();
    if (!exchange) return;

    this.isSubmitting.set(true);
    const error = await this.#exchangesStore.delete(exchange.id);
    if (!error) {
      this.exchangeDeleting.set(null);
      this.#shiftsStore.reload();
    }
    this.isSubmitting.set(false);
  }

  protected handleNext() {
    const nextDate = this.#state.calculateNext();
    this.#updateQueryParams(nextDate, this.viewMode());
  }

  protected handlePrev() {
    const prevDate = this.#state.calculatePrev();
    this.#updateQueryParams(prevDate, this.viewMode());
  }

  protected handleToday() {
    this.#updateQueryParams(new Date(), this.viewMode());
  }

  protected handleSetView(view: 'day' | 'week' | 'month') {
    this.#updateQueryParams(this.#state.selectedDate(), view);
  }

  protected handleQuickCreateForDate(date: Date) {
    this.#router.navigate(['/bars', this.barId(), 'roster', 'new'], {
      queryParams: {
        date: this.#dateFormatter.formatDayId(date),
        view: this.viewMode(),
      },
    });
  }

  protected handleOpenReplicateConfirm() {
    this.showReplicateConfirm.set(true);
    const dialogRef = this.#dialog.open(this.replicateWeekDialogRef());
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.handleConfirmReplicate();
      } else {
        this.handleCancelReplicate();
      }
    });
  }

  protected handleCancelReplicate() {
    this.showReplicateConfirm.set(false);
  }

  protected async handleConfirmReplicate() {
    this.showReplicateConfirm.set(false);
    this.isSubmitting.set(true);

    try {
      const selected = this.#state.selectedDate();
      const prevWeekStart = startOfWeek(subWeeks(selected, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(selected, 1), { weekStartsOn: 1 });

      const startLocal = new Date(prevWeekStart);
      startLocal.setHours(0, 0, 0, 0);
      const endLocal = new Date(prevWeekEnd);
      endLocal.setHours(23, 59, 59, 999);

      const startIso = startLocal.toISOString();
      const endIso = endLocal.toISOString();

      // Fetch previous week's shifts directly
      const url = `/bars/${this.barId()}/shifts?startDate=${startIso}&endDate=${endIso}`;
      const rawShifts = await firstValueFrom(this.#http.get<Shift[]>(url));

      if (rawShifts && rawShifts.length > 0) {
        // Replicate each shift by adding exactly 7 days
        for (const shift of rawShifts) {
          const newStart = addDays(new Date(shift.startTime), 7).toISOString();
          const newEnd = addDays(new Date(shift.endTime), 7).toISOString();

          await this.#shiftsStore.create({
            userId: shift.userId,
            startTime: newStart,
            endTime: newEnd,
            notes: shift.notes || undefined,
          });
        }
      }

      this.#shiftsStore.reload();
    } catch (error) {
      console.error('Error replicating shifts:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
