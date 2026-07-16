import { Component, computed, effect, inject, input } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, Order } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { ActionFeedback, asOrderId } from '@coaster/core';
import { ActiveOrdersStore, OrderHistoryStore } from '@coaster/orders';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../../../components/loading/loading';
import { StatCard } from '../../../../../components/stat-card/stat-card';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-history',
  imports: [
    MatDatepicker,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatInput,
    Loading,
    TranslatePipe,
    MatIcon,
    MatButton,
    MatIconButton,
    PricePipe,
    StatCard,
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './history.html',
})
class History {
  public readonly barId = input.required<BarId>();

  readonly #orderHistoryStore = inject(OrderHistoryStore);
  readonly #activeOrdersStore = inject(ActiveOrdersStore);
  readonly #barsStore = inject(BarsStore);
  readonly #confirmation = inject(ConfirmationDialog);

  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);
  readonly #feedback = inject(ActionFeedback);

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#orderHistoryStore.setBarId(barId);
      this.#activeOrdersStore.setBarId(barId);
    });
  }

  readonly today = new Date().toISOString().split('T')[0];
  readonly todayDate = new Date();
  protected readonly selectedDate = this.#orderHistoryStore.selectedDate;
  protected readonly selectedDateAsDate = computed(() => new Date(this.#orderHistoryStore.selectedDate()));
  protected readonly isLoading = this.#orderHistoryStore.history.isLoading;
  protected readonly totalClosed = this.#orderHistoryStore.totalClosed;
  protected readonly totalCancelled = this.#orderHistoryStore.totalCancelled;

  readonly isToday = computed(() => this.#orderHistoryStore.selectedDate() === this.today);
  readonly isOwner = this.#barsStore.isOwner;

  readonly totalRevenue = this.#orderHistoryStore.historyTotalRevenue;
  readonly averageTicket = this.#orderHistoryStore.averageTicket;

  protected readonly ordersViewModel = computed(() => {
    if (!this.#orderHistoryStore.history.hasValue()) {
      return [];
    }

    const orders = this.#orderHistoryStore.history.value() ?? [];
    return orders.map((order) => ({
      original: order,
      tableName: order.tableName ?? this.#translate.instant('orders.no_table'),
      statusClass: this.#statusClasses(order),
      statusLabel: this.#statusLabel(order),
      formattedTime: this.#formatTime(order.createdAt),
    }));
  });

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.#orderHistoryStore.setHistoryDate(input.value);
    }
  }

  onDatePickerChange(date: Date | null) {
    if (date) {
      this.#orderHistoryStore.setHistoryDate(date.toISOString().split('T')[0]);
    }
  }

  prevDay() {
    const current = new Date(this.#orderHistoryStore.selectedDate());
    current.setDate(current.getDate() - 1);
    this.#orderHistoryStore.setHistoryDate(current.toISOString().split('T')[0]);
  }

  nextDay() {
    if (this.isToday()) return;
    const current = new Date(this.#orderHistoryStore.selectedDate());
    current.setDate(current.getDate() + 1);
    this.#orderHistoryStore.setHistoryDate(current.toISOString().split('T')[0]);
  }

  goToday() {
    this.#orderHistoryStore.setHistoryDate(this.today);
  }

  goYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.#orderHistoryStore.setHistoryDate(yesterday.toISOString().split('T')[0]);
  }

  onOrderClicked(order: Order) {
    this.#router.navigate(['/app/bars', this.barId(), 'orders', order.id]);
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
      await this.#activeOrdersStore.deleteOrder(this.barId(), asOrderId(order.id));
      this.#orderHistoryStore.reloadHistory();
    } catch (error) {
      this.#feedback.error(error);
    }
  }
}

export default History;
