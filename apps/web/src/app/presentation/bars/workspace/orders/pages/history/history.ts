import { Component, computed, effect, inject, input, inputBinding, outputBinding, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardSubtitle, MatCardTitle } from '@angular/material/card';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, Order } from '@coaster/common';
import { OrderStatus } from '@coaster/common';
import { asOrderId } from '@coaster/core';
import { OrdersStore } from '@coaster/orders';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmDialogComponent } from '../../../../../components/confirm-dialog/confirm-dialog.component';
import { Loading } from '../../../../../components/loading/loading';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-history',
  imports: [
    MatCard,
    MatCardTitle,
    MatCardSubtitle,
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
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './history.html',
})
class History {
  public readonly barId = input.required<BarId>();

  readonly #ordersStore = inject(OrdersStore);
  readonly #barsStore = inject(BarsStore);
  readonly #dialog = inject(MatDialog);

  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#ordersStore.setBarId(barId);
    });
  }

  readonly today = new Date().toISOString().split('T')[0];
  readonly todayDate = new Date();
  protected readonly selectedDate = this.#ordersStore.selectedDate;
  protected readonly selectedDateAsDate = computed(() => new Date(this.#ordersStore.selectedDate()));
  protected readonly isLoading = this.#ordersStore.history.isLoading;
  protected readonly totalClosed = this.#ordersStore.totalClosed;
  protected readonly totalCancelled = this.#ordersStore.totalCancelled;

  protected readonly orderToDelete = signal<Order | null>(null);

  readonly isToday = computed(() => this.#ordersStore.selectedDate() === this.today);
  readonly isOwner = this.#barsStore.isOwner;

  readonly totalRevenue = this.#ordersStore.historyTotalRevenue;
  readonly averageTicket = this.#ordersStore.averageTicket;

  protected readonly ordersViewModel = computed(() => {
    if (!this.#ordersStore.history.hasValue()) {
      return [];
    }

    const orders = this.#ordersStore.history.value() ?? [];
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
      this.#ordersStore.setHistoryDate(input.value);
    }
  }

  onDatePickerChange(date: Date | null) {
    if (date) {
      this.#ordersStore.setHistoryDate(date.toISOString().split('T')[0]);
    }
  }

  prevDay() {
    const current = new Date(this.#ordersStore.selectedDate());
    current.setDate(current.getDate() - 1);
    this.#ordersStore.setHistoryDate(current.toISOString().split('T')[0]);
  }

  nextDay() {
    if (this.isToday()) return;
    const current = new Date(this.#ordersStore.selectedDate());
    current.setDate(current.getDate() + 1);
    this.#ordersStore.setHistoryDate(current.toISOString().split('T')[0]);
  }

  goToday() {
    this.#ordersStore.setHistoryDate(this.today);
  }

  goYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.#ordersStore.setHistoryDate(yesterday.toISOString().split('T')[0]);
  }

  onOrderClicked(order: Order) {
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
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

  protected handleDeleteOrder(order: Order) {
    this.orderToDelete.set(order);
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      bindings: [
        inputBinding('destructive', () => true),
        inputBinding('title', () => this.#translate.instant('history.delete_title')),
        inputBinding('text', () => this.#translate.instant('history.delete_message')),
        outputBinding('canceled', () => {
          this.handleCancelDeleteOrder();
          dialogRef.close();
        }),
        outputBinding('deleted', () => {
          this.handleDeleteOrderConfirmed();
          dialogRef.close();
        }),
      ],
    });
  }

  protected handleCancelDeleteOrder() {
    this.orderToDelete.set(null);
  }

  protected async handleDeleteOrderConfirmed() {
    const order = this.orderToDelete();
    if (!order) {
      return;
    }

    await this.#ordersStore.deleteOrder(this.barId(), asOrderId(order.id));
    this.#ordersStore.reloadHistory();
    this.orderToDelete.set(null);
  }
}

export default History;
