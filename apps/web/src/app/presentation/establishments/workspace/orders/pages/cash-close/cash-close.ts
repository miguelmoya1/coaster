import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, min, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
  cashCloseTicket,
  cashDifferenceOf,
  expectedCashOf,
  ManageCashCloses,
  type CashClose,
  type CashClosePreview,
} from '@coaster/cash-close';
import {
  ActionFeedback,
  DateFormatterService,
  handleErrorFormField,
  loadedOr,
  todayCalendarDate,
  type EstablishmentId,
  type PageResource,
} from '@coaster/core';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import { PrintTicket } from '@coaster/printer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { DayPicker } from '../../../../../components/day-picker/day-picker';
import { Field } from '../../../../../components/field/field';
import { FormErrors } from '../../../../../components/field/form-errors';
import { CoasterInput } from '../../../../../components/field/input.directive';
import { ResourceStatus } from '../../../../../components/resource-status/resource-status';
import { NumberInput } from '../../../../../components/number-input/number-input';
import { StatCard } from '../../../../../components/stat-card/stat-card';
import { PricePipe } from '../../../pipes/price/price';

const toCents = (euros: number) => Math.round((euros || 0) * 100);

@Component({
  selector: 'coaster-cash-close',
  imports: [
    FormRoot,
    FormField,
    MatButton,
    MatIcon,
    TranslatePipe,
    Field,
    FormErrors,
    CoasterInput,
    ResourceStatus,
    NumberInput,
    StatCard,
    PricePipe,
    RequireSubscriptionDirective,
    DayPicker,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './cash-close.html',
})
class CashClosePage {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly preview = input.required<PageResource<CashClosePreview>>();
  public readonly history = input.required<PageResource<CashClose[]>>();
  public readonly date = input<string>();

  readonly #manageCashCloses = inject(ManageCashCloses);
  readonly #currentEstablishment = inject(CurrentEstablishmentStore);
  readonly #printTicket = inject(PrintTicket);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);
  readonly #dates = inject(DateFormatterService);
  readonly #router = inject(Router);

  protected readonly printingId = signal<string | null>(null);
  protected readonly undoing = signal(false);
  protected readonly when = (iso: string) => this.#dates.formatDateTime(iso);

  protected readonly today = todayCalendarDate();
  protected readonly selectedDate = computed(() => this.date() ?? this.today);

  protected readonly historyList = computed(() => loadedOr(this.history(), []));

  protected readonly lastCloseId = computed(() => {
    const since = this.current()?.since;
    return this.historyList().find((cashClose) => !cashClose.voidedAt && cashClose.closedAt === since)?.id;
  });

  readonly #formBase = signal({ openingFloat: 0, countedCash: 0, notes: '' });

  protected readonly form = form(
    this.#formBase,
    (fields) => {
      required(fields.openingFloat);
      min(fields.openingFloat, 0);
      required(fields.countedCash);
      min(fields.countedCash, 0);
      maxLength(fields.notes, 500);
    },
    {
      submission: {
        action: async (form) => {
          const { openingFloat, countedCash, notes } = form().value();
          const confirmed = await this.#confirmation.confirm({
            title: this.#translate.instant('cash_close.confirm_title'),
            text: this.#translate.instant('cash_close.confirm_message', {
              count: this.current()?.closedOrders ?? 0,
            }),
            confirmLabel: this.#translate.instant('cash_close.close'),
          });

          if (!confirmed) {
            return null;
          }

          try {
            await this.#manageCashCloses.close(this.establishmentId(), {
              openingFloat: toCents(openingFloat),
              countedCash: toCents(countedCash),
              notes: notes.trim() || undefined,
            });
            this.preview().reload();
            this.history().reload();
            this.showDay(this.today);
            this.form().reset({ openingFloat, countedCash: 0, notes: '' });
            this.#feedback.success(this.#translate.instant('cash_close.closed'));
            return null;
          } catch (error) {
            return handleErrorFormField(error);
          }
        },
      },
    },
  );

  protected readonly current = computed(() => {
    const preview = this.preview();
    return preview.hasValue() ? preview.value() : undefined;
  });

  protected readonly expectedCash = computed(() =>
    expectedCashOf(toCents(this.form.openingFloat().value()), this.current()?.cashAmount ?? 0),
  );

  protected readonly difference = computed(() =>
    cashDifferenceOf(
      toCents(this.form.countedCash().value()),
      toCents(this.form.openingFloat().value()),
      this.current()?.cashAmount ?? 0,
    ),
  );

  constructor() {
    effect(() => {
      const openingFloat = this.current()?.openingFloat;
      if (openingFloat !== undefined && !this.form.openingFloat().dirty()) {
        this.form.openingFloat().value.set(openingFloat / 100);
      }
    });
  }

  protected showDay(date: string) {
    void this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'cash-close'], {
      queryParams: { date: date === this.today ? null : date },
    });
  }

  protected async print(cashClose: CashClose) {
    this.printingId.set(cashClose.id);

    try {
      await this.#printTicket.executeText(this.establishmentId(), this.#ticketOf(cashClose));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.printingId.set(null);
    }
  }

  protected async undo(cashClose: CashClose) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('cash_close.undo_title'),
      text: this.#translate.instant('cash_close.undo_message', { count: cashClose.closedOrders }),
      confirmLabel: this.#translate.instant('cash_close.undo'),
    });

    if (!confirmed) {
      return;
    }

    this.undoing.set(true);
    try {
      await this.#manageCashCloses.void(this.establishmentId(), cashClose.id);
      this.preview().reload();
      this.history().reload();
      this.#feedback.success(this.#translate.instant('cash_close.undone'));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.undoing.set(false);
    }
  }

  #ticketOf(cashClose: CashClose): string {
    const t = (key: string, params?: Record<string, string>) => this.#translate.instant(key, params);
    return cashCloseTicket(cashClose, {
      title: t('cash_close.ticket_title'),
      establishmentName: this.#currentEstablishment.current.value()?.name ?? '',
      closedAt: this.when(cashClose.closedAt),
      since: cashClose.since
        ? t('cash_close.since', { date: this.when(cashClose.since) })
        : t('cash_close.since_start'),
      closedBy: t('cash_close.closed_by', { name: cashClose.closedByName }),
      closedOrders: t('cash_close.closed_orders'),
      cancelledOrders: t('cash_close.cancelled_orders'),
      cash: t('cash_close.cash'),
      card: t('cash_close.card'),
      tips: t('cash_close.tips'),
      total: t('cash_close.total'),
      openingFloat: t('cash_close.opening_float'),
      expected: t('cash_close.expected'),
      counted: t('cash_close.counted'),
      difference: t('cash_close.difference'),
      notes: t('cash_close.notes'),
    });
  }
}

export default CashClosePage;
