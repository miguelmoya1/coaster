import {
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  inputBinding,
  outputBinding,
  signal,
} from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { ActivatedRoute, createUrlTreeFromSnapshot, isActive, Router, RouterLink } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import type {
  EstablishmentId,
  Shift,
  ShiftExchange,
  ShiftExchangeId,
  ShiftId,
  TimeEntry,
  TimeEntryType,
} from '@coaster/common';
import { EstablishmentPermission, EstablishmentRole } from '@coaster/common';
import { ActionFeedback, DateFormatterService } from '@coaster/core';
import { ExchangesStore } from '@coaster/exchanges';
import { MembersStore } from '@coaster/establishment-members';
import { ScheduleStateService } from '@coaster/schedule';
import { ShiftsStore } from '@coaster/shifts';
import { TimeTrackingStore } from '@coaster/time-tracking';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addDays, endOfWeek, isSameDay, startOfWeek, subWeeks } from 'date-fns';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../../components/loading/loading';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';
import { Fab } from '../../components/fab/fab';
import { ClockCard } from './components/clock-card/clock-card';
import { CreateShiftForm } from './components/create-shift-form/create-shift-form';
import { ExchangeRequestCard } from './components/exchange-request-card/exchange-request-card';
import { ScheduleMonthlyGrid } from './components/schedule-monthly-grid/schedule-monthly-grid';
import { ScheduleNavigation } from './components/schedule-navigation/schedule-navigation';
import { ScheduleWeeklyGrid } from './components/schedule-weekly-grid/schedule-weekly-grid';
import { ShiftCard } from './components/shift-card/shift-card';
import { TimeEntryForm } from './components/time-entry-form/time-entry-form';
import { VoidEntryForm } from './components/void-entry-form/void-entry-form';
import { ExportTimesheetForm } from './components/export-timesheet-form/export-timesheet-form';
import { WorkdayCard } from './components/workday-card/workday-card';

export type DailyShiftItem = Shift & {
  timeRange: string;
  roleName: EstablishmentRole;
  hasPendingExchange: boolean;
  isOwn: boolean;
  isPast: boolean;
};

export type PendingExchangeItem = ShiftExchange & {
  month: string;
  day: string;
  shiftPeriod: string;
  timeRange: string;
  roleName: EstablishmentRole;
  isOwnRequest: boolean;
  hasStarted: boolean;
};

const toDailyShiftItem = (
  shift: Shift,
  now: Date,
  pendingShiftIds: ReadonlySet<string>,
  currentUserId: string | undefined,
  dateFormatter: DateFormatterService,
): DailyShiftItem => ({
  ...shift,
  timeRange: dateFormatter.formatTimeRange(shift.startTime, shift.endTime),
  roleName: EstablishmentRole.STAFF,
  hasPendingExchange: pendingShiftIds.has(shift.id),
  isOwn: shift.userId === currentUserId,
  isPast: new Date(shift.startTime) < now,
});

@Component({
  selector: 'coaster-schedule',
  imports: [
    Loading,
    Fab,
    ShiftCard,
    TranslatePipe,
    ExchangeRequestCard,
    RouterLink,
    ScheduleNavigation,
    ScheduleWeeklyGrid,
    ScheduleMonthlyGrid,
    MatIcon,
    PageContainer,
    PageHeader,
    RequireSubscriptionDirective,
    ClockCard,
    WorkdayCard,
    MatButton,
  ],
  providers: [ScheduleStateService],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 relative',
  },
  templateUrl: './schedule.html',
})
export default class Schedule {
  protected readonly EstablishmentRole = EstablishmentRole;
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly date = input<string>();
  public readonly view = input<'day' | 'week' | 'month'>();

  readonly #state = inject(ScheduleStateService);
  readonly #shiftsStore = inject(ShiftsStore);
  readonly #dateFormatter = inject(DateFormatterService);
  readonly #membersStore = inject(MembersStore);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #exchangesStore = inject(ExchangesStore);
  readonly #timeTrackingStore = inject(TimeTrackingStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #bottomSheet = inject(MatBottomSheet);
  readonly #injector = inject(Injector);

  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);

  readonly shifts = this.#shiftsStore.shifts;
  readonly myWorkday = this.#timeTrackingStore.myWorkday;
  readonly currentWorkday = this.#timeTrackingStore.currentWorkday;
  readonly clockState = this.#timeTrackingStore.clockState;
  readonly teamWorkdays = this.#timeTrackingStore.teamWorkdays;

  readonly canClockIn = computed(() => this.#hasPermission(EstablishmentPermission.ESTABLISHMENT_CLOCK_IN));
  readonly canCreateShift = computed(() => this.#hasPermission(EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT));
  readonly canDeleteShift = computed(() => this.#hasPermission(EstablishmentPermission.ESTABLISHMENT_DELETE_SHIFT));
  readonly canAmendOwnEntries = computed(() =>
    this.#hasPermission(EstablishmentPermission.ESTABLISHMENT_AMEND_OWN_TIME_ENTRY),
  );
  readonly canViewTimeEntries = computed(() =>
    this.#hasPermission(EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES),
  );
  readonly canManageTimeEntries = computed(() =>
    this.#hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_TIME_ENTRIES),
  );

  readonly teamWorkdaysList = computed(() => {
    if (!this.teamWorkdays.hasValue()) {
      return [];
    }

    return this.teamWorkdays.value() ?? [];
  });
  readonly pendingExchanges = this.#exchangesStore.exchanges;
  readonly displayMonthYear = this.#state.displayMonthYear;
  readonly displaySelectedDate = computed(() => {
    return this.#dateFormatter.formatShortDate(this.#state.selectedDate());
  });
  readonly displayToday = this.#state.displayToday;
  readonly scrollerDays = this.#state.scrollerDays;
  readonly viewMode = this.#state.viewMode;

  readonly isSubmitting = signal(false);
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
    if (!this.#myMemberStore.myMember.hasValue()) {
      return undefined;
    }
    return this.#myMemberStore.myMember.value()?.userId;
  });

  readonly selectedDayId = computed(() => this.#dateFormatter.formatDayId(this.#state.selectedDate()));

  readonly isViewingToday = computed(() => isSameDay(this.#state.selectedDate(), new Date()));

  readonly currentUserRole = computed(() => {
    if (!this.#myMemberStore.myMember.hasValue()) {
      return undefined;
    }
    return this.#myMemberStore.myMember.value()?.role;
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
    const pendingShiftIds = this.pendingShiftIds();
    const currentUserId = this.currentUserId();

    return this.shifts
      .value()
      .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === selectedId)
      .map((shift) => toDailyShiftItem(shift, now, pendingShiftIds, currentUserId, this.#dateFormatter));
  });

  readonly weekViewDays = computed(() => {
    if (!this.shifts.hasValue()) {
      return [];
    }

    const now = new Date();
    const shiftsList = this.shifts.value();
    const pendingShiftIds = this.pendingShiftIds();
    const currentUserId = this.currentUserId();

    return this.#state.activeWeekDays().map((date) => {
      const dayId = this.#dateFormatter.formatDayId(date);
      const dayShifts = shiftsList
        .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === dayId)
        .map((shift) => toDailyShiftItem(shift, now, pendingShiftIds, currentUserId, this.#dateFormatter));

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
    const pendingShiftIds = this.pendingShiftIds();
    const currentUserId = this.currentUserId();

    return this.#state.calendarMonthDays().map((day) => {
      const dayShifts = shiftsList
        .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === day.id)
        .map((shift) => toDailyShiftItem(shift, now, pendingShiftIds, currentUserId, this.#dateFormatter));

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
      shiftPeriod: 'schedule.exchanges.period_' + this.#dateFormatter.formatShiftPeriod(exchange.shiftStartTime),
      timeRange: this.#dateFormatter.formatTimeRange(exchange.shiftStartTime, exchange.shiftEndTime),
      roleName: EstablishmentRole.STAFF as EstablishmentRole,
      isOwnRequest: exchange.requesterId === this.currentUserId(),
      hasStarted: new Date(exchange.shiftStartTime) <= new Date(),
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
      const establishmentId = this.establishmentId();

      this.#exchangesStore.setEstablishmentId(establishmentId);
      this.#shiftsStore.setEstablishmentId(establishmentId);
      this.#membersStore.setEstablishmentId(establishmentId);
      this.#timeTrackingStore.setEstablishmentId(establishmentId);
    });

    effect(() => {
      const { from, to } = this.#state.timeSheetRange();

      this.#timeTrackingStore.setRange(from, to);
    });

    effect(() => {
      this.#timeTrackingStore.setTeamEnabled(this.canViewTimeEntries());
    });

    effect(() => {
      const isCreateMode = this.isCreateMode();

      if (isCreateMode) {
        const bottomSheetRef = this.#bottomSheet.open(CreateShiftForm, {
          disableClose: true,
          injector: this.#injector,
          bindings: [
            inputBinding('members', () => this.membersList()),
            outputBinding('canceled', () => {
              bottomSheetRef.dismiss();
              this.handleCloseModal();
            }),
            outputBinding('created', () => {
              bottomSheetRef.dismiss();
              this.handleCreateShift();
            }),
          ],
        });
      }
    });
  }

  protected updateQueryParams(date: Date, view: 'day' | 'week' | 'month') {
    this.#router.navigate([], {
      relativeTo: this.#route,
      queryParams: {
        date: this.#dateFormatter.formatDayId(date),
        view: view,
      },
      queryParamsHandling: 'merge',
    });
  }

  protected handleDaySelected(dateStr: string) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      this.updateQueryParams(parsed, 'day');
    }
  }

  protected handleCloseModal() {
    this.#router.navigate(['/establishments', this.establishmentId(), 'schedule'], {
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

    try {
      await this.#exchangesStore.accept(exchangeId);
      this.#shiftsStore.reload();
      this.#exchangesStore.reload();
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleOfferExchange(shiftId: ShiftId) {
    this.isSubmitting.set(true);

    try {
      await this.#exchangesStore.request(shiftId, {});
      this.#shiftsStore.reload();
      this.#exchangesStore.reload();
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleClickDeleteShift(shift: DailyShiftItem) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('schedule.delete_shift_title'),
      text: this.#translate.instant('schedule.delete_shift_confirm'),
    });

    if (!confirmed) return;

    this.isSubmitting.set(true);
    try {
      await this.#shiftsStore.delete(shift.id);
      this.#exchangesStore.reload();
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleClickDeleteExchange(exchange: PendingExchangeItem) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('schedule.exchanges.delete_title'),
      text: this.#translate.instant('schedule.exchanges.delete_confirm'),
    });

    if (!confirmed) return;

    this.isSubmitting.set(true);
    try {
      await this.#exchangesStore.delete(exchange.id);
      this.#shiftsStore.reload();
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected handleNext() {
    const nextDate = this.#state.calculateNext();
    this.updateQueryParams(nextDate, this.viewMode());
  }

  protected handlePrev() {
    const prevDate = this.#state.calculatePrev();
    this.updateQueryParams(prevDate, this.viewMode());
  }

  protected handleToday() {
    this.updateQueryParams(new Date(), this.viewMode());
  }

  protected handleSetView(view: 'day' | 'week' | 'month') {
    this.updateQueryParams(this.#state.selectedDate(), view);
  }

  protected handleQuickCreateForDate(date: Date) {
    this.#router.navigate(['/establishments', this.establishmentId(), 'schedule', 'new'], {
      queryParams: {
        date: this.#dateFormatter.formatDayId(date),
        view: this.viewMode(),
      },
    });
  }

  protected async handleOpenReplicateConfirm() {
    const confirmed = await this.#confirmation.confirm({
      title: this.#translate.instant('schedule.replication.confirm_title'),
      text: this.#translate.instant('schedule.replication.confirm_msg'),
    });

    if (confirmed) {
      await this.handleConfirmReplicate();
    }
  }

  protected async handleConfirmReplicate() {
    this.isSubmitting.set(true);

    try {
      const selected = this.#state.selectedDate();
      const prevWeekStart = startOfWeek(subWeeks(selected, 1), { weekStartsOn: 1 });
      const prevWeekEnd = endOfWeek(subWeeks(selected, 1), { weekStartsOn: 1 });

      const startLocal = new Date(prevWeekStart);
      startLocal.setHours(0, 0, 0, 0);
      const endLocal = new Date(prevWeekEnd);
      endLocal.setHours(23, 59, 59, 999);

      const rawShifts = await this.#shiftsStore.listBetween(startLocal.toISOString(), endLocal.toISOString());

      if (rawShifts && rawShifts.length > 0) {
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
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleClock(type: TimeEntryType) {
    this.isSubmitting.set(true);

    try {
      await this.#timeTrackingStore.clock(type, await this.#currentPosition());
      this.#feedback.success(this.#translate.instant('schedule.time_tracking.clock_saved'));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected handleAmendEntry(entry: TimeEntry) {
    const sheetRef = this.#bottomSheet.open(TimeEntryForm, {
      disableClose: true,
      injector: this.#injector,
      bindings: [
        inputBinding('entry', () => entry),
        inputBinding('workdayDate', () => entry.workdayDate),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding('saved', () => {
          sheetRef.dismiss();
        }),
      ],
    });
  }

  protected handleVoidEntry(entry: TimeEntry) {
    const sheetRef = this.#bottomSheet.open(VoidEntryForm, {
      disableClose: true,
      injector: this.#injector,
      bindings: [
        inputBinding('entry', () => entry),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding('voided', () => {
          sheetRef.dismiss();
        }),
      ],
    });
  }

  protected handleCreateEntry() {
    const sheetRef = this.#bottomSheet.open(TimeEntryForm, {
      disableClose: true,
      injector: this.#injector,
      bindings: [
        inputBinding('members', () => this.membersList()),
        inputBinding('workdayDate', () => this.selectedDayId()),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding('saved', () => {
          sheetRef.dismiss();
        }),
      ],
    });
  }

  protected handleDownloadTimeSheet() {
    const { from, to } = this.#state.timeSheetRange();

    const sheetRef = this.#bottomSheet.open(ExportTimesheetForm, {
      injector: this.#injector,
      bindings: [
        inputBinding('from', () => from),
        inputBinding('to', () => to),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding<{ from: string; to: string }>('confirmed', (range) => {
          sheetRef.dismiss();
          void this.#downloadTimeSheet(range);
        }),
      ],
    });
  }

  async #downloadTimeSheet(range: { from: string; to: string }) {
    this.isSubmitting.set(true);

    try {
      const blob = await this.#timeTrackingStore.exportCsv(range);
      const suffix = range.from === range.to ? range.from : `${range.from}_${range.to}`;
      this.#download(blob, `registro-horario-${suffix}.csv`);
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleVerifyIntegrity() {
    this.isSubmitting.set(true);

    try {
      const integrity = await this.#timeTrackingStore.verifyIntegrity();
      const key = integrity.valid ? 'schedule.time_tracking.integrity_ok' : 'schedule.time_tracking.integrity_broken';

      this.#feedback.info(this.#translate.instant(key, { entries: integrity.checkedEntries }));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  #hasPermission(permission: EstablishmentPermission): boolean {
    return this.#myMemberStore.hasPermission(permission);
  }

  #download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async #currentPosition(): Promise<{ latitude: number; longitude: number } | undefined> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve(undefined),
        { timeout: 3000, maximumAge: 60_000 },
      );
    });
  }
}
