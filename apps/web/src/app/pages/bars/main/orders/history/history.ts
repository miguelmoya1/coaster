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
  template: `
    <div class="flex bg-surface-container rounded-2xl p-1 gap-1">
      <a
        class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        [routerLink]="['/bars', barId(), 'orders', 'tables']"
      >
        {{ 'orders.tables_title' | translate }}
      </a>
      <div class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm bg-primary text-on-primary">
        {{ 'history.title' | translate }}
      </div>
    </div>

    <div class="flex items-center justify-between bg-surface-container rounded-2xl p-3 gap-2">
      <button
        class="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform text-on-surface-variant hover:text-on-surface cursor-pointer"
        (click)="prevDay()"
      >
        <ng-icon name="lucideChevronLeft" size="20" />
      </button>

      <div class="flex items-center gap-2 flex-1 justify-center">
        <ng-icon name="lucideCalendar" size="18" class="text-primary" />
        <input
          type="date"
          class="bg-transparent text-on-surface font-bold text-center outline-none cursor-pointer"
          [value]="historyService.selectedDate()"
          [max]="today"
          (change)="onDateChange($event)"
        />
      </div>

      <button
        class="w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
        [class]="isToday() ? 'text-outline/30 cursor-not-allowed' : 'text-on-surface-variant hover:text-on-surface'"
        [disabled]="isToday()"
        (click)="nextDay()"
      >
        <ng-icon name="lucideChevronRight" size="20" />
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button coaster-btn variant="outline" class="text-xs! py-1! px-3!" (click)="goToday()">
        {{ 'history.today' | translate }}
      </button>
      <button coaster-btn variant="outline" class="text-xs! py-1! px-3!" (click)="goYesterday()">
        {{ 'history.yesterday' | translate }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <coaster-status-card status="primary">
        <div class="text-xs text-on-surface-variant font-medium mb-1">{{ 'history.revenue' | translate }}</div>
        <div class="text-2xl font-black text-on-surface">{{ formattedRevenue() }}</div>
      </coaster-status-card>

      <coaster-status-card status="success">
        <div class="text-xs text-on-surface-variant font-medium mb-1">{{ 'history.total_orders' | translate }}</div>
        <div class="text-2xl font-black text-on-surface">{{ historyService.totalClosed() }}</div>
      </coaster-status-card>

      <coaster-status-card status="error">
        <div class="text-xs text-on-surface-variant font-medium mb-1">{{ 'history.cancelled' | translate }}</div>
        <div class="text-2xl font-black text-on-surface">{{ historyService.totalCancelled() }}</div>
      </coaster-status-card>

      <coaster-status-card status="warning">
        <div class="text-xs text-on-surface-variant font-medium mb-1">{{ 'history.avg_ticket' | translate }}</div>
        <div class="text-2xl font-black text-on-surface">{{ formattedAvgTicket() }}</div>
      </coaster-status-card>
    </div>

    <h2 coaster-title>{{ 'history.orders_list' | translate }}</h2>

    @if (historyService.all.isLoading()) {
      <coaster-loading />
    }

    <div class="flex flex-col gap-3 pb-24">
      @for (order of historyService.all.value() ?? []; track order.id) {
        <div
          role="button"
          tabindex="0"
          class="rounded-2xl border border-outline-variant/20 bg-surface-container p-4 flex flex-col gap-2 transition-colors cursor-pointer hover:bg-surface-container-high text-left focus:outline-none focus:ring-2 focus:ring-primary/50"
          (click)="onOrderClicked(order)"
          (keydown.enter)="onOrderClicked(order)"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-bold text-on-surface">{{ order.tableName ?? ('orders.no_table' | translate) }}</span>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-full" [class]="statusClasses(order)">
                {{ statusLabel(order) | translate }}
              </span>
            </div>
            <span class="text-sm text-on-surface-variant">{{ formatTime(order.createdAt) }}</span>
          </div>

          <div class="flex flex-col gap-1 text-sm text-on-surface-variant">
            @for (item of order.items; track item.id) {
              <div class="flex justify-between">
                <span
                  >{{ item.productName ?? item.productId }} <span class="text-xs">x{{ item.quantity }}</span></span
                >
                <span class="text-xs font-bold text-on-surface">{{
                  formatPrice(item.priceAtPurchase * item.quantity)
                }}</span>
              </div>
            }
          </div>

          <div class="flex items-center justify-between">
            <span class="text-lg font-black text-primary">{{ formatPrice(order.totalAmount) }}</span>

            @if (isOwner() && isToday()) {
              <button
                class="w-9 h-9 rounded-xl flex items-center justify-center text-error active:scale-90 transition-transform hover:bg-error/10 cursor-pointer"
                (click)="onDeleteOrder(order); $event.stopPropagation()"
              >
                <ng-icon name="lucideTrash2" size="18" />
              </button>
            }
          </div>
        </div>
      } @empty {
        @if (!historyService.all.isLoading()) {
          <div class="text-center text-on-surface-variant py-8">
            {{ 'history.no_orders' | translate }}
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class History {
  public readonly barId = input.required<BarId>();

  readonly historyService = inject(BarOrderHistory);
  readonly #orderRepository = inject(OrderRepository);
  readonly #currentUser = inject(CurrentUser);
  readonly #barMembers = inject(BarMembers);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly today = new Date().toISOString().split('T')[0];

  readonly isToday = computed(() => this.historyService.selectedDate() === this.today);

  readonly isOwner = computed(() => {
    const members = this.#barMembers.list.value() ?? [];
    const userId = this.#currentUser.current.value()?.id;
    return members.find((m) => m.userId === userId)?.role === 'OWNER';
  });

  readonly formattedRevenue = computed(() => this.formatPrice(this.historyService.totalRevenue()));
  readonly formattedAvgTicket = computed(() => this.formatPrice(this.historyService.averageTicket()));

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.historyService.setBarContext(barId);
      this.#barMembers.setBarContext(barId);
    });
  }

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.historyService.setDate(input.value);
    }
  }

  prevDay() {
    const current = new Date(this.historyService.selectedDate());
    current.setDate(current.getDate() - 1);
    this.historyService.setDate(current.toISOString().split('T')[0]);
  }

  nextDay() {
    if (this.isToday()) return;
    const current = new Date(this.historyService.selectedDate());
    current.setDate(current.getDate() + 1);
    this.historyService.setDate(current.toISOString().split('T')[0]);
  }

  goToday() {
    this.historyService.setDate(this.today);
  }

  goYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    this.historyService.setDate(yesterday.toISOString().split('T')[0]);
  }

  onOrderClicked(order: Order) {
    this.#router.navigate(['/bars', this.barId(), 'orders', order.id]);
  }

  formatPrice(cents: number): string {
    return (cents / 100).toFixed(2) + ' €';
  }

  formatTime(isoDate?: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  statusClasses(order: Order): string {
    if (order.status === OrderStatus.CLOSED) return 'bg-secondary/20 text-secondary';
    if (order.status === OrderStatus.CANCELLED) return 'bg-error/20 text-error';
    return 'bg-primary/20 text-primary';
  }

  statusLabel(order: Order): string {
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
          this.historyService.reload();
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}

export default History;
