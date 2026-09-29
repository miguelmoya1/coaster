import { Component, computed, inject, input } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import { ActionFeedback, loadedOr, type EstablishmentId, type PageResource } from '@coaster/core';
import { asOrderId, ManageOrder, orderHistorySummary, OrderStatus, todayIso, type Order } from '@coaster/orders';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../../components/confirm-dialog/confirmation-dialog.service';
import { DayPicker } from '../../../../../components/day-picker/day-picker';
import { ResourceStatus } from '../../../../../components/resource-status/resource-status';
import { StatCard } from '../../../../../components/stat-card/stat-card';
import { PricePipe } from '../../../pipes/price/price';

@Component({
  selector: 'coaster-history',
  imports: [
    DayPicker,
    ResourceStatus,
    TranslatePipe,
    MatIcon,
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
  protected readonly selectedDate = computed(() => this.date() ?? this.today);

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

  protected showDay(date: string) {
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
