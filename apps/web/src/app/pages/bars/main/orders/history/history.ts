import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BarId, Order, OrderStatus, asOrderId } from '@coaster/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideChevronLeft, lucideChevronRight, lucideTrash2 } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../../../core';
import { BarMembers } from '../../../../../members';
import { BarOrderHistory, OrderRepository } from '../../../../../orders';
import { CoasterBtn, CoasterTitle, ConfirmDialogComponent, Loading, StatusCard } from '../../../../../shared';

@Component({
  selector: 'coaster-history',
  imports: [StatusCard, Loading, CoasterTitle, TranslatePipe, NgIcon, CoasterBtn, RouterLink],
  viewProviders: [provideIcons({ lucideCalendar, lucideChevronLeft, lucideChevronRight, lucideTrash2 })],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './history.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class History {
  public readonly barId = input.required<BarId>();

  readonly #historyService = inject(BarOrderHistory);
  readonly #orderRepository = inject(OrderRepository);
  readonly #currentUser = inject(CurrentUser);
  readonly #barMembers = inject(BarMembers);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly today = new Date().toISOString().split('T')[0];

  protected readonly selectedDate = this.#historyService.selectedDate;
  protected readonly isLoading = this.#historyService.all.isLoading;
  protected readonly totalClosed = this.#historyService.totalClosed;
  protected readonly totalCancelled = this.#historyService.totalCancelled;

  readonly isToday = computed(() => this.#historyService.selectedDate() === this.today);

  readonly isOwner = computed(() => {
    if (!this.#barMembers.list.hasValue() || !this.#currentUser.current.hasValue()) {
      return false;
    }
    const members = this.#barMembers.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  readonly formattedRevenue = computed(() => this.#formatPrice(this.#historyService.totalRevenue()));
  readonly formattedAvgTicket = computed(() => this.#formatPrice(this.#historyService.averageTicket()));

  protected readonly ordersViewModel = computed(() => {
    if (!this.#historyService.all.hasValue()) {
      return [];
    }

    const orders = this.#historyService.all.value() ?? [];
    return orders.map((order) => ({
      original: order,
      tableName: order.tableName ?? this.#translate.instant('orders.no_table'),
      statusClass: this.#statusClasses(order),
      statusLabel: this.#statusLabel(order),
      formattedTime: this.#formatTime(order.createdAt),
      formattedTotalAmount: this.#formatPrice(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        productName: item.productName ?? item.productId,
        formattedPrice: this.#formatPrice(item.priceAtPurchase * item.quantity),
      })),
    }));
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#historyService.setBarContext(barId);
      this.#barMembers.setBarContext(barId);
    });
  }

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.#historyService.setDate(input.value);
    }
  }

  prevDay() {
    const current = new Date(this.#historyService.selectedDate());
    current.setDate(current.getDate() - 1);
    this.#historyService.setDate(current.toISOString().split('T')[0]);
  }

  nextDay() {
    if (this.isToday()) return;
    const current = new Date(this.#historyService.selectedDate());
    current.setDate(current.getDate() + 1);
    this.#historyService.setDate(current.toISOString().split('T')[0]);
  }

  goToday() {
    this.#historyService.setDate(this.today);
  }

  goYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.#historyService.setDate(yesterday.toISOString().split('T')[0]);
  }

  onOrderClicked(order: Order) {
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
  }

  #formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' €';
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

  async onDeleteOrder(order: Order) {
    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.#translate.instant('history.delete_title'),
        message: this.#translate.instant('history.delete_message'),
        confirmText: 'common.delete',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#orderRepository.deleteOrder(this.barId(), asOrderId(order.id));
          this.#historyService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default History;
