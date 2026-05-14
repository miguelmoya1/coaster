import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, BarRole, ShiftExchangeId, ShiftId } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideRepeat2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentUser, DateFormatterService } from '../../../../core';
import { ExchangesStore } from '../../../../exchanges';
import { MembersStore } from '../../../../members';
import { RosterStateService } from '../../../../roster';
import { BottomSheet, CoasterTitle, Fab, Loading } from '../../../../shared';
import { ShiftsStore } from '../../../../shifts';
import { CreateShiftForm } from './components/create-shift-form/create-shift-form';
import { ExchangeRequestCard } from './components/exchange-request-card/exchange-request-card';
import { HorizontalDateScroller } from './components/horizontal-date-scroller/horizontal-date-scroller';
import { ShiftCard } from './components/shift-card/shift-card';

@Component({
  selector: 'coaster-roster',
  imports: [
    Loading,
    Fab,
    HorizontalDateScroller,
    ShiftCard,
    CoasterTitle,
    NgIcon,
    TranslatePipe,
    BottomSheet,
    CreateShiftForm,
    ExchangeRequestCard,
    RouterLink,
  ],
  providers: [RosterStateService],
  viewProviders: [provideIcons({ lucideClock, lucideRepeat2 })],
  host: {
    class: 'flex flex-col gap-2 relative h-full',
  },
  templateUrl: './roster.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Roster {
  public readonly barId = input.required<BarId>();

  readonly #state = inject(RosterStateService);
  readonly #shiftsStore = inject(ShiftsStore);
  readonly #dateFormatter = inject(DateFormatterService);
  readonly #membersStore = inject(MembersStore);
  readonly #currentUser = inject(CurrentUser);
  readonly #exchangesStore = inject(ExchangesStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly shifts = this.#shiftsStore.shifts;
  readonly pendingExchanges = this.#exchangesStore.exchanges;
  readonly displayMonthYear = this.#state.displayMonthYear;
  readonly displayToday = this.#state.displayToday;
  readonly scrollerDays = this.#state.scrollerDays;

  readonly isSubmitting = signal(false);

  readonly isCreateMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['new']),
    this.#router,
  );

  readonly membersList = computed(() => this.#membersStore.list.value());
  readonly currentUserId = computed(() => this.#currentUser.current.value()?.id);
  readonly selectedDayId = computed(() => this.#dateFormatter.formatDayId(this.#state.selectedDate()));
  readonly currentUserRole = computed(() => {
    const barMember = this.#membersStore.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    return barMember?.role;
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

    return this.shifts.value().map((shift) => ({
      ...shift,
      timeRange: this.#dateFormatter.formatTimeRange(shift.startTime, shift.endTime),
      roleName: BarRole.STAFF,
      hasPendingExchange: this.pendingShiftIds().has(shift.id),
      isOwn: shift.userId === this.currentUserId(),
    }));
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
      roleName: BarRole.STAFF,
      isOwnRequest: exchange.requesterId === this.currentUserId(),
    }));
  });

  constructor() {
    effect(() => {
      const range = this.#state.dailyShiftsRange();
      this.#shiftsStore.setDateRange(range.startIso, range.endIso);
    });

    effect(() => {
      const barId = this.barId();

      this.#exchangesStore.setBarId(barId);
    });
  }

  protected handleDaySelected(dayId: string) {
    this.#state.selectDay(dayId);
  }

  protected handleCloseModal() {
    this.#router.navigate(['/bars', this.barId(), 'roster']);
  }

  protected handleCreateShift() {
    this.#exchangesStore.reload();
    this.handleCloseModal();
  }

  protected async handleAcceptExchange(exchangeId: ShiftExchangeId) {
    this.isSubmitting.set(true);

    try {
      await this.#exchangesStore.accept(exchangeId);
    } catch {
      this.isSubmitting.set(false);
      return;
    }

    this.#shiftsStore.reload();
    this.isSubmitting.set(false);
  }

  protected async handleOfferExchange(shiftId: ShiftId) {
    this.isSubmitting.set(true);

    try {
      await this.#exchangesStore.request(shiftId, {});
    } catch {
      this.isSubmitting.set(false);
      return;
    }

    this.#shiftsStore.reload();
    this.isSubmitting.set(false);
  }
}
