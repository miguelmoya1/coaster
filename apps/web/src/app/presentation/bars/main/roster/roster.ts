import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, BarRole, CreateShiftDto, ShiftExchangeId, ShiftId } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideRepeat2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentUser, DateFormatterService, handleErrorFormField } from '../../../../core';
import { ExchangesStore } from '../../../../exchanges';
import { MembersStore } from '../../../../members';
import { RosterStateService } from '../../../../roster';
import { BottomSheet, CoasterTitle, Fab, Loading } from '../../../../shared';
import { BarShifts, CreateShift, CreateShiftForm, HorizontalDateScroller, ShiftCard } from '../../../../shifts';
import { ExchangeRequestCard } from './components/exchange-request-card/exchange-request-card';

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
  readonly #barShifts = inject(BarShifts);
  readonly #dateFormatter = inject(DateFormatterService);
  readonly #membersStore = inject(MembersStore);
  readonly #currentUser = inject(CurrentUser);
  readonly #createShift = inject(CreateShift);
  readonly #exchangesStore = inject(ExchangesStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly list = this.#barShifts.all;
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
    if (!this.list.hasValue()) {
      return [];
    }

    return this.list.value().map((shift) => ({
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
      this.#barShifts.setDateRange(range.startIso, range.endIso);
    });

    effect(() => {
      const barId = this.barId();

      this.#exchangesStore.setBarId(barId);
    });
  }

  onDaySelected(dayId: string) {
    this.#state.selectDay(dayId);
  }

  closeModal() {
    this.#router.navigate(['/bars', this.barId(), 'roster']);
  }

  readonly shiftSubmit = async (payload: CreateShiftDto) => {
    this.isSubmitting.set(true);

    const selectedDate = this.#state.selectedDate();

    const fullPayload: CreateShiftDto = {
      ...payload,
      startTime: this.#dateFormatter.buildIso(selectedDate, payload.startTime),
      endTime: this.#dateFormatter.buildIso(selectedDate, payload.endTime),
    };

    try {
      await this.#createShift.execute(this.barId(), fullPayload);
    } catch (error: unknown) {
      this.isSubmitting.set(false);
      return handleErrorFormField(error);
    }

    this.#barShifts.reload();
    this.closeModal();
    this.isSubmitting.set(false);

    return null;
  };

  async onAcceptExchange(exchangeId: ShiftExchangeId) {
    this.isSubmitting.set(true);

    try {
      await this.#exchangesStore.accept(exchangeId);
    } catch {
      this.isSubmitting.set(false);
      return;
    }

    this.#barShifts.reload();
    this.isSubmitting.set(false);
  }

  async onOfferExchange(shiftId: ShiftId) {
    this.isSubmitting.set(true);

    try {
      await this.#exchangesStore.request(shiftId, {});
    } catch {
      this.isSubmitting.set(false);
      return;
    }

    this.#barShifts.reload();
    this.isSubmitting.set(false);
  }
}
