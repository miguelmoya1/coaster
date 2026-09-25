import { asOrderId } from '@coaster/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import type { EstablishmentId, Order } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { ActionFeedback, loadedOr, type PageResource } from '@coaster/core';
import { ManageOrder, orderHistorySummary, todayIso } from '@coaster/orders';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { ResourceStatus } from '../../../../../components/resource-status/resource-status';
import { StatCard } from '../../../../../components/stat-card/stat-card';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-history',
  imports: [
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    ResourceStatus,
    TranslatePipe,
    MatIcon,
    MatButton,
    MatIconButton,
    PricePipe,
    StatCard,
    RequireSubscriptionDirective,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './history.html',
})
class History {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly history = input.required<PageResource<Order[]>>();
  public readonly date = input<string>();

  readonly #manageOrder = inject(ManageOrder);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #confirmation = inject(ConfirmationDialog);

  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);
  readonly #feedback = inject(ActionFeedback);

  readonly today = todayIso();
  readonly todayDate = new Date();
  protected readonly selectedDate = computed(() => this.date() ?? this.today);
  protected readonly selectedDateAsDate = computed(() => new Date(this.selectedDate()));

  readonly #orders = computed(() => loadedOr(this.history(), []));
  protected readonly summary = computed(() => orderHistorySummary(this.#orders()));

  readonly isToday = computed(() => this.selectedDate() === this.today);
  readonly isOwner = this.#myMemberStore.isOwner;

  protected readonly ordersViewModel = computed(() =>
    this.#orders().map((order) => ({
      original: order,
      tableName: order.tableName ?? this.#translate.instant('orders.no_table'),
      statusClass: this.#statusClasses(order),
      statusLabel: this.#statusLabel(order),
      formattedTime: this.#formatTime(order.createdAt),
    })),
  );

  onDatePickerChange(date: Date | null) {
    if (date) {
      this.#showDay(date.toISOString().split('T')[0]);
    }
  }

  prevDay() {
    this.#showDay(this.#shift(-1));
  }

  nextDay() {
    if (this.isToday()) return;
    this.#showDay(this.#shift(1));
  }

  goToday() {
    this.#showDay(this.today);
  }

  goYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.#showDay(yesterday.toISOString().split('T')[0]);
  }

  #shift(days: number): string {
    const current = new Date(this.selectedDate());
    current.setDate(current.getDate() + days);
    return current.toISOString().split('T')[0];
  }

  #showDay(date: string) {
    void this.#router.navigate(['/establishments', this.establishmentId(), 'orders', 'history'], {
      queryParams: { date: date === this.today ? null : date },
    });
  }

  onOrderClicked(order: Order) {
    this.#router.navigate(['/establishments', this.establishmentId(), 'orders', order.id]);
  }

  #formatTime(isoDate?: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  #statusClasses(order: Order): string {
    if (order.status === OrderStatus.CLOSED) return 'bg-secondary/20 text-secondary';
    if (order.status === OrderStatus.CANCELLED) return 'bg-error/20 text-error';
    return 'bg-primary/20 text-primary';
  }

  #statusLabel(order: Order): string {
    if (order.status === OrderStatus.CLOSED) return 'history.status_closed';
    if (order.status === OrderStatus.CANCELLED) return 'history.status_cancelled';
    return 'history.status_open';
  }

  protected async handleDeleteOrder(order: Order) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant('history.delete_title'),
      text: this.#translate.instant('history.delete_message'),
    });

    if (!confirmed) return;

    try {
      await this.#manageOrder.delete(this.establishmentId(), asOrderId(order.id));
      this.history().reload();
    } catch (error) {
      this.#feedback.error(error);
    }
  }
}

export default History;
