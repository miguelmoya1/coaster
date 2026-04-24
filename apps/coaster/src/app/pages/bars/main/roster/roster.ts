import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, BarRole, CreateShiftDto, ShiftExchangeId, ShiftId } from '@coaster/interfaces';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideRepeat2 } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiError, CurrentUser, DateFormatterService, handleErrorFormField } from '../../../../core';
import { AcceptExchange, BarExchanges, ExchangeRequestCard, RequestExchange } from '../../../../exchanges';
import { BarMembers } from '../../../../members';
import { RosterStateService } from '../../../../roster';
import { BottomSheet, CoasterTitle, Fab, Loading } from '../../../../shared';
import { BarShifts, CreateShift, CreateShiftForm, HorizontalDateScroller, ShiftCard } from '../../../../shifts';

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
  readonly #barMembers = inject(BarMembers);
  readonly #currentUser = inject(CurrentUser);
  readonly #createShift = inject(CreateShift);
  readonly #barExchanges = inject(BarExchanges);
  readonly #acceptExchange = inject(AcceptExchange);
  readonly #requestExchange = inject(RequestExchange);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  readonly list = this.#barShifts.all;
  readonly pendingExchanges = this.#barExchanges.pending;
  readonly displayMonthYear = this.#state.displayMonthYear;
  readonly displayToday = this.#state.displayToday;
  readonly scrollerDays = this.#state.scrollerDays;

  readonly isSubmitting = signal(false);
  readonly formError = signal<string | undefined>(undefined);

  readonly isCreateMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['new']),
    this.#router,
  );

  readonly membersList = computed(() => this.#barMembers.list.value());
  readonly currentUserId = computed(() => this.#currentUser.current.value()?.id);
  readonly selectedDayId = computed(() => this.#dateFormatter.formatDayId(this.#state.selectedDate()));
  readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
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
      const barId = this.barId();
      this.#barShifts.setContext(barId);
      this.#barMembers.setBarContext(barId);
      this.#barExchanges.setBarContext(barId);
    });

    effect(() => {
      const range = this.#state.dailyShiftsRange();
      this.#barShifts.setDateRange(range.startIso, range.endIso);
    });
  }

  onDaySelected(dayId: string) {
    this.#state.selectDay(dayId);
  }

  closeModal() {
    this.formError.set(undefined);
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
    this.#barExchanges.reload();
    this.closeModal();
    this.isSubmitting.set(false);

    return null;
  };

  async onAcceptExchange(exchangeId: ShiftExchangeId) {
    await this.#handleFormSubmission(
      async () => {
        await this.#acceptExchange.execute(this.barId(), exchangeId);
      },
      () => {
        this.#barExchanges.reload();
        this.#barShifts.reload();
      },
    );
  }

  async onOfferExchange(shiftId: ShiftId) {
    await this.#handleFormSubmission(
      async () => {
        await this.#requestExchange.execute(this.barId(), shiftId, {});
      },
      () => {
        this.#barExchanges.reload();
        this.#barShifts.reload();
      },
    );
  }

  async #handleFormSubmission(action: () => Promise<void>, onSuccess: () => void) {
    this.formError.set(undefined);
    this.isSubmitting.set(true);

    try {
      await action();
      onSuccess();
    } catch (error: unknown) {
      this.formError.set(error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
