import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, CreateShiftDto, ShiftExchangeId, ShiftId } from '@coaster/interfaces';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideRepeat2 } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ApiError, CurrentUser, DateFormatterService, prepareDefaultProfileImage } from '../../../../core';
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

  protected readonly state = inject(RosterStateService);
  protected readonly barShifts = inject(BarShifts);
  protected readonly translate = inject(TranslateService);
  protected readonly dateFormatter = inject(DateFormatterService);

  readonly #barMembers = inject(BarMembers);
  readonly #currentUser = inject(CurrentUser);
  readonly #createShift = inject(CreateShift);
  readonly #barExchanges = inject(BarExchanges);
  readonly #acceptExchange = inject(AcceptExchange);
  readonly #requestExchange = inject(RequestExchange);

  protected readonly list = this.barShifts.all;
  protected readonly pendingExchanges = this.#barExchanges.pending;
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  protected readonly isCreateMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['new']),
    this.#router,
  );
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | undefined>(undefined);
  protected readonly membersList = computed(() => this.#barMembers.list.value());
  protected readonly currentUserId = computed(() => this.#currentUser.current.value()?.id);
  protected readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    return barMember?.role;
  });
  protected readonly pendingShiftIds = computed(() => {
    if (!this.pendingExchanges.hasValue()) return new Set<string>();

    const exchanges = this.pendingExchanges.value();
    return new Set(exchanges.map((e) => e.shiftId));
  });

  protected readonly dailyShifts = computed(() => {
    if (!this.list.hasValue()) return [];

    return this.list.value().map((shift) => ({
      ...shift,
      profileImage: shift.userImage || this.#getProfileImage(shift.userName),
    }));
  });

  protected readonly pendingExchangesList = computed(() => {
    if (!this.pendingExchanges.hasValue()) return [];
    return this.pendingExchanges.value();
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.barShifts.setContext(barId);
      this.#barMembers.setBarContext(barId);
      this.#barExchanges.setBarContext(barId);
    });

    effect(() => {
      const range = this.state.dailyShiftsRange();
      this.barShifts.setDateRange(range.startIso, range.endIso);
    });
  }

  protected readonly selectedDayId = computed(() => this.dateFormatter.formatDayId(this.state.selectedDate()));

  protected onDaySelected(dayId: string) {
    this.state.selectDay(dayId);
  }

  protected closeModal() {
    this.formError.set(undefined);
    this.#router.navigate(['/bars', this.barId(), 'roster']);
  }

  protected async onShiftSubmit(payload: CreateShiftDto) {
    const selectedDate = this.state.selectedDate();

    const fullPayload: CreateShiftDto = {
      ...payload,
      startTime: this.dateFormatter.buildIso(selectedDate, payload.startTime),
      endTime: this.dateFormatter.buildIso(selectedDate, payload.endTime),
    };

    await this.#handleFormSubmission(
      async () => {
        await this.#createShift.execute(this.barId(), fullPayload);
      },
      () => {
        this.barShifts.reload();
        this.closeModal();
      },
    );
  }

  protected async onAcceptExchange(exchangeId: ShiftExchangeId) {
    await this.#handleFormSubmission(
      async () => {
        await this.#acceptExchange.execute(this.barId(), exchangeId);
      },
      () => {
        this.#barExchanges.reload();
        this.barShifts.reload();
      },
    );
  }

  protected async onOfferExchange(shiftId: ShiftId) {
    await this.#handleFormSubmission(
      async () => {
        await this.#requestExchange.execute(this.barId(), shiftId, {});
      },
      () => {
        this.#barExchanges.reload();
      },
    );
  }

  #getProfileImage(name?: string) {
    return prepareDefaultProfileImage(undefined, name ?? this.translate.instant('roster.unassigned'));
  }

  async #handleFormSubmission(action: () => Promise<void>, onSuccess: () => void) {
    this.formError.set(undefined);

    try {
      this.isSubmitting.set(true);
      await action();
      onSuccess();
    } catch (error: unknown) {
      this.formError.set(error instanceof ApiError ? error.message : 'UNEXPECTED_ERROR');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
