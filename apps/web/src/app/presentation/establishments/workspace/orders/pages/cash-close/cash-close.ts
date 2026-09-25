import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, min, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { CashClose, EstablishmentId } from '@coaster/common';
import { cashDifferenceOf, EstablishmentPermission, expectedCashOf } from '@coaster/common';
import { CashCloseStore, cashCloseTicket } from '@coaster/cash-close';
import { ActionFeedback, DateFormatterService, handleErrorFormField } from '@coaster/core';
import { MyMemberStore } from '@coaster/establishment-members';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import { CurrentEstablishmentStore } from '@coaster/establishments';
import { PrintTicket } from '@coaster/printer';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { Field } from '../../../../../components/field/field';
import { FormErrors } from '../../../../../components/field/form-errors';
import { CoasterInput } from '../../../../../components/field/input.directive';
import { Loading } from '../../../../../components/loading/loading';
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
    Loading,
    NumberInput,
    StatCard,
    PricePipe,
    RequireSubscriptionDirective,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './cash-close.html',
})
class CashClosePage {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #store = inject(CashCloseStore);
  readonly #myMember = inject(MyMemberStore);
  readonly #currentEstablishment = inject(CurrentEstablishmentStore);
  readonly #printTicket = inject(PrintTicket);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);
  readonly #dates = inject(DateFormatterService);

  protected readonly preview = this.#store.preview;
  protected readonly history = this.#store.history;
  protected readonly printingId = signal<string | null>(null);
  protected readonly when = (iso: string) => this.#dates.formatDateTime(iso);

  protected readonly canSeeHistory = computed(() =>
    this.#myMember.hasPermission(EstablishmentPermission.ESTABLISHMENT_VIEW_FINANCIALS),
  );

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
              count: this.preview.value()?.closedOrders ?? 0,
            }),
            confirmLabel: this.#translate.instant('cash_close.close'),
          });

          if (!confirmed) {
            return null;
          }

          try {
            await this.#store.close(this.establishmentId(), {
              openingFloat: toCents(openingFloat),
              countedCash: toCents(countedCash),
              notes: notes.trim() || undefined,
            });
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

  protected readonly expectedCash = computed(() =>
    expectedCashOf(toCents(this.form.openingFloat().value()), this.preview.value()?.cashAmount ?? 0),
  );

  protected readonly difference = computed(() =>
    cashDifferenceOf(
      toCents(this.form.countedCash().value()),
      toCents(this.form.openingFloat().value()),
      this.preview.value()?.cashAmount ?? 0,
    ),
  );

  constructor() {
    effect(() => this.#store.setEstablishmentId(this.establishmentId()));

    effect(() => {
      const openingFloat = this.preview.value()?.openingFloat;
      if (openingFloat !== undefined && !this.form.openingFloat().dirty()) {
        this.form.openingFloat().value.set(openingFloat / 100);
      }
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
