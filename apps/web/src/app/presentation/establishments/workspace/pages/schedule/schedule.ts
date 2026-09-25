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
  EstablishmentMember,
  Shift,
  ShiftExchange,
  ShiftExchangeId,
  ShiftId,
  TimeEntry,
  TimeEntryType,
  Workday,
} from '@coaster/common';
import { EstablishmentPermission, EstablishmentRole } from '@coaster/common';
import { ActionFeedback, DateFormatterService, loadedOr, type PageResource } from '@coaster/core';
import { ManageExchanges } from '@coaster/exchanges';
import { ScheduleStateService, scheduleDateOf, scheduleViewOf, type ScheduleView } from '@coaster/schedule';
import { ManageShifts } from '@coaster/shifts';
import { clockStateOf, ManageTimeEntries, workdayOn } from '@coaster/time-tracking';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { addDays, endOfWeek, isSameDay, startOfWeek, subWeeks } from 'date-fns';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import { ResourceStatus } from '../../../../components/resource-status/resource-status';
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
    ResourceStatus,
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
  public readonly view = input<ScheduleView>();
  public readonly shifts = input.required<PageResource<Shift[]>>();
  public readonly exchanges = input.required<PageResource<ShiftExchange[]>>();
  public readonly members = input.required<PageResource<EstablishmentMember[]>>();
  public readonly myWorkdays = input.required<PageResource<Workday[]>>();
  public readonly runningWorkday = input.required<PageResource<Workday | null>>();
  public readonly teamWorkdays = input.required<PageResource<Workday[]>>();

  readonly #state = inject(ScheduleStateService);
  readonly #manageShifts = inject(ManageShifts);
  readonly #manageExchanges = inject(ManageExchanges);
  readonly #manageTimeEntries = inject(ManageTimeEntries);
  readonly #dateFormatter = inject(DateFormatterService);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #bottomSheet = inject(MatBottomSheet);
  readonly #injector = inject(Injector);

  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);

  readonly #shiftList = computed(() => loadedOr(this.shifts(), []));
  readonly myWorkday = computed(() => workdayOn(loadedOr(this.myWorkdays(), []), this.#state.timeSheetRange().from));
  readonly currentWorkday = computed(() => loadedOr(this.runningWorkday(), null) ?? undefined);
  readonly clockState = computed(() => clockStateOf(this.currentWorkday()));
  readonly isClockLoading = computed(() => this.runningWorkday().isLoading());

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

  readonly teamWorkdaysList = computed(() => loadedOr(this.teamWorkdays(), []));
  readonly #exchangeList = computed(() => loadedOr(this.exchanges(), []));
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

  readonly membersList = computed(() => loadedOr(this.members(), []));

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

  readonly pendingShiftIds = computed(() => new Set(this.#exchangeList().map((e) => e.shiftId)));

  readonly dailyShifts = computed(() => {
    const now = new Date();
    const selectedId = this.selectedDayId();
    const pendingShiftIds = this.pendingShiftIds();
    const currentUserId = this.currentUserId();

    return this.#shiftList()
      .filter((shift) => this.#dateFormatter.formatDayId(new Date(shift.startTime)) === selectedId)
      .map((shift) => toDailyShiftItem(shift, now, pendingShiftIds, currentUserId, this.#dateFormatter));
  });

  readonly weekViewDays = computed(() => {
    const now = new Date();
    const shiftsList = this.#shiftList();
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
    const now = new Date();
    const shiftsList = this.#shiftList();
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

  readonly pendingExchangesList = computed(() =>
    this.#exchangeList().map((exchange) => ({
      ...exchange,
      month: this.#dateFormatter.formatMonth(exchange.shiftStartTime),
      day: this.#dateFormatter.formatDay(exchange.shiftStartTime),
      shiftPeriod: 'schedule.exchanges.period_' + this.#dateFormatter.formatShiftPeriod(exchange.shiftStartTime),
      timeRange: this.#dateFormatter.formatTimeRange(exchange.shiftStartTime, exchange.shiftEndTime),
      roleName: EstablishmentRole.STAFF as EstablishmentRole,
      isOwnRequest: exchange.requesterId === this.currentUserId(),
      hasStarted: new Date(exchange.shiftStartTime) <= new Date(),
    })),
  );

  constructor() {
    effect(() => this.#state.setDate(scheduleDateOf(this.date())));

    effect(() => this.#state.setViewMode(scheduleViewOf(this.view())));

    effect(() => {
      const isCreateMode = this.isCreateMode();

      if (isCreateMode) {
        const bottomSheetRef = this.#bottomSheet.open(CreateShiftForm, {
          disableClose: true,
          injector: this.#injector,
          bindings: [
            inputBinding('establishmentId', () => this.establishmentId()),
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

  protected updateQueryParams(date: Date, view: ScheduleView) {
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
    this.shifts().reload();
    this.exchanges().reload();
    this.handleCloseModal();
  }

  #reloadShifts() {
    this.shifts().reload();
    this.exchanges().reload();
  }

  #reloadTimeSheet() {
    this.myWorkdays().reload();
    this.runningWorkday().reload();
    this.teamWorkdays().reload();
  }

  protected async handleAcceptExchange(exchangeId: ShiftExchangeId) {
    this.isSubmitting.set(true);

    try {
      await this.#manageExchanges.accept(this.establishmentId(), exchangeId);
      this.#reloadShifts();
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleOfferExchange(shiftId: ShiftId) {
    this.isSubmitting.set(true);

    try {
      await this.#manageExchanges.request(this.establishmentId(), shiftId, {});
      this.#reloadShifts();
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
      await this.#manageShifts.delete(this.establishmentId(), shift.id);
      this.#reloadShifts();
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
      await this.#manageExchanges.delete(this.establishmentId(), exchange.id);
      this.#reloadShifts();
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

  protected handleSetView(view: ScheduleView) {
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

      const rawShifts = await this.#manageShifts.listBetween(
        this.establishmentId(),
        startLocal.toISOString(),
        endLocal.toISOString(),
      );

      if (rawShifts && rawShifts.length > 0) {
        for (const shift of rawShifts) {
          const newStart = addDays(new Date(shift.startTime), 7).toISOString();
          const newEnd = addDays(new Date(shift.endTime), 7).toISOString();

          await this.#manageShifts.create(this.establishmentId(), {
            userId: shift.userId,
            startTime: newStart,
            endTime: newEnd,
            notes: shift.notes || undefined,
          });
        }
      }

      this.shifts().reload();
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async handleClock(type: TimeEntryType) {
    this.isSubmitting.set(true);

    try {
      await this.#manageTimeEntries.clock(this.establishmentId(), type, await this.#currentPosition());
      this.#feedback.success(this.#translate.instant('schedule.time_tracking.clock_saved'));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.#reloadTimeSheet();
      this.isSubmitting.set(false);
    }
  }

  protected handleAmendEntry(entry: TimeEntry) {
    const sheetRef = this.#bottomSheet.open(TimeEntryForm, {
      disableClose: true,
      injector: this.#injector,
      bindings: [
        inputBinding('establishmentId', () => this.establishmentId()),
        inputBinding('entry', () => entry),
        inputBinding('workdayDate', () => entry.workdayDate),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding('saved', () => {
          sheetRef.dismiss();
          this.#reloadTimeSheet();
        }),
      ],
    });
  }

  protected handleVoidEntry(entry: TimeEntry) {
    const sheetRef = this.#bottomSheet.open(VoidEntryForm, {
      disableClose: true,
      injector: this.#injector,
      bindings: [
        inputBinding('establishmentId', () => this.establishmentId()),
        inputBinding('entry', () => entry),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding('voided', () => {
          sheetRef.dismiss();
          this.#reloadTimeSheet();
        }),
      ],
    });
  }

  protected handleCreateEntry() {
    const sheetRef = this.#bottomSheet.open(TimeEntryForm, {
      disableClose: true,
      injector: this.#injector,
      bindings: [
        inputBinding('establishmentId', () => this.establishmentId()),
        inputBinding('members', () => this.membersList()),
        inputBinding('workdayDate', () => this.selectedDayId()),
        outputBinding('canceled', () => {
          sheetRef.dismiss();
        }),
        outputBinding('saved', () => {
          sheetRef.dismiss();
          this.#reloadTimeSheet();
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
      const blob = await this.#manageTimeEntries.exportCsv(this.establishmentId(), range);
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
      const integrity = await this.#manageTimeEntries.verifyIntegrity(this.establishmentId());
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
