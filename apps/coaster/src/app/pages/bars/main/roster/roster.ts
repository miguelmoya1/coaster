import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';

import { BarId, CreateShiftDto, ShiftExchangeId, ShiftId } from '@coaster/interfaces';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideRepeat2 } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { format } from 'date-fns';
import { ApiError, CurrentUser, prepareDefaultProfileImage } from '../../../../core';
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
  ],
  providers: [RosterStateService],
  viewProviders: [provideIcons({ lucideClock, lucideRepeat2 })],
  host: {
    class: 'flex flex-col gap-2 relative h-full',
  },
  template: `
    <div class="flex items-center justify-between mb-4 mt-2">
      <div class="flex flex-col gap-0.5">
        <span class="text-on-surface-variant font-bold uppercase tracking-widest text-sm">
          {{ state.displayMonthYear() }}
        </span>
        <h1 coaster-title>{{ 'roster.title' | translate }}</h1>
      </div>

      <div class="flex flex-col items-end gap-0.5 opacity-80">
        <span class="text-on-surface-variant font-bold uppercase tracking-widest text-xs">
          {{ 'roster.today' | translate }}
        </span>
        <span class="text-white font-bold text-sm"> {{ state.displayToday() }} </span>
      </div>
    </div>

    <coaster-horizontal-date-scroller
      [days]="state.scrollerDays()"
      [selectedDay]="selectedDayId()"
      (daySelected)="onDaySelected($event)"
      class="mb-6"
    />

    <h2 coaster-title class="mb-4 flex items-center gap-2 text-on-surface">
      <ng-icon name="lucideClock" class="text-primary text-xl" />
      {{ 'roster.daily_assignments' | translate }}
    </h2>

    @if (list.isLoading()) {
      <coaster-loading />
    } @else {
      <div class="flex flex-col gap-3">
        @if (list.hasValue() && list.value().length) {
          @for (shift of list.value(); track shift.id) {
            <coaster-shift-card
              [timeRange]="formatTimeRange(shift.startTime, shift.endTime)"
              [staffName]="shift.userName || ('roster.unassigned' | translate)"
              [roleName]="'STAFF'"
              [staffImage]="shift.userImage || getProfileImage(shift.userName)"
              [isOwn]="shift.userId === currentUserId()"
              [hasPendingExchange]="pendingShiftIds().has(shift.id)"
              roleColorClass="bg-primary text-primary"
              (offerExchange)="onOfferExchange(shift.id)"
            />
          }
        } @else {
          <div class="text-center py-10 opacity-50 text-white font-bold my-auto">
            {{ 'roster.no_shifts' | translate }}
          </div>
        }
      </div>
    }

    @if (pendingExchanges.hasValue() && pendingExchanges.value().length) {
      <h2 coaster-title class="mt-8 mb-4 flex items-center gap-2 text-on-surface">
        <ng-icon name="lucideRepeat2" class="text-tertiary text-xl" />
        {{ 'roster.exchanges.title' | translate }}
        <span class="ml-auto text-sm font-bold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
          {{ pendingExchanges.value().length }}
        </span>
      </h2>

      <div class="flex flex-col gap-3 pb-24">
        @for (exchange of pendingExchanges.value(); track exchange.id) {
          <coaster-exchange-request-card
            [month]="formatMonth(exchange.shiftStartTime)"
            [day]="formatDay(exchange.shiftStartTime)"
            [shiftPeriod]="formatShiftPeriod(exchange.shiftStartTime)"
            [roleName]="'STAFF'"
            [timeRange]="formatTimeRange(exchange.shiftStartTime, exchange.shiftEndTime)"
            [offeredBy]="exchange.requesterName"
            [disabled]="isSubmitting()"
            [isOwnRequest]="exchange.requesterId === currentUserId()"
            (accepted)="onAcceptExchange(exchange.id)"
          />
        }
      </div>
    } @else {
      <div class="pb-24"></div>
    }

    @if (currentUserRole() === 'OWNER') {
      <coaster-fab (click)="openBottomSheet()" />
    }

    @if (isSheetOpen()) {
      <coaster-bottom-sheet (closed)="isSheetOpen.set(false)">
          <coaster-create-shift-form
            [members]="membersList() ?? []"
            [disabled]="isSubmitting() || list.isLoading()"
            [(error)]="formError"
            (createShift)="onShiftSubmit($event)"
            (canceled)="isSheetOpen.set(false)"
          />
      </coaster-bottom-sheet>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Roster {
  public readonly barId = input.required<BarId>();

  protected readonly state = inject(RosterStateService);
  protected readonly barShifts = inject(BarShifts);
  protected readonly translate = inject(TranslateService);

  readonly #barMembers = inject(BarMembers);
  readonly #currentUser = inject(CurrentUser);
  readonly #createShift = inject(CreateShift);
  readonly #barExchanges = inject(BarExchanges);
  readonly #acceptExchange = inject(AcceptExchange);
  readonly #requestExchange = inject(RequestExchange);

  protected readonly list = this.barShifts.all;
  protected readonly pendingExchanges = this.#barExchanges.pending;
  protected readonly isSheetOpen = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | undefined>(undefined);

  protected readonly membersList = computed(() => this.#barMembers.list.value());

  protected readonly currentUserId = computed(() => this.#currentUser.current.value()?.id);

  protected readonly currentUserRole = computed(() => {
    const barMember = this.#barMembers.list.value()?.find((m) => m.userId === this.#currentUser.current.value()?.id);
    return barMember?.role;
  });

  protected readonly pendingShiftIds = computed(() => {
    const exchanges = this.pendingExchanges.value() ?? [];
    return new Set(exchanges.map((e) => e.shiftId));
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

  protected readonly selectedDayId = computed(() => format(this.state.selectedDate(), 'yyyy-MM-dd'));

  protected onDaySelected(dayId: string) {
    this.state.selectDay(dayId);
  }

  protected openBottomSheet() {
    this.formError.set(undefined);
    this.isSheetOpen.set(true);
  }

  protected async onShiftSubmit(payload: CreateShiftDto) {
    const selectedDate = this.state.selectedDate();

    const fullPayload: CreateShiftDto = {
      ...payload,
      startTime: this.#buildIso(selectedDate, payload.startTime),
      endTime: this.#buildIso(selectedDate, payload.endTime),
    };

    await this.#handleFormSubmission(
      async () => {
        await this.#createShift.execute(this.barId(), fullPayload);
      },
      () => {
        this.barShifts.reload();
        this.isSheetOpen.set(false);
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

  protected formatTimeRange(startIso: string, endIso: string) {
    try {
      const start = new Date(startIso);
      const end = new Date(endIso);
      return `${format(start, 'HH:mm')} — ${format(end, 'HH:mm')}`;
    } catch {
      return '';
    }
  }

  protected formatMonth(iso: string) {
    return format(new Date(iso), 'MMM').toUpperCase();
  }

  protected formatDay(iso: string) {
    return format(new Date(iso), 'd');
  }

  protected formatShiftPeriod(iso: string) {
    const hour = new Date(iso).getHours();
    if (hour < 12) return this.translate.instant('roster.exchanges.period_morning');
    if (hour < 18) return this.translate.instant('roster.exchanges.period_afternoon');
    return this.translate.instant('roster.exchanges.period_evening');
  }

  protected getProfileImage(name?: string) {
    return prepareDefaultProfileImage(undefined, name ?? this.translate.instant('roster.unassigned'));
  }

  #buildIso(date: Date, timeString: string): string {
    const [hours, minutes] = timeString.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result.toISOString();
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
