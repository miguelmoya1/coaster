import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { BarId, BulkUpdateItemDto, Order, OrderItem, asOrderId, asOrderItemId } from '@coaster/common';
import { OrderTitlePipe, OrdersStore } from '@coaster/orders';
import { CoasterBtn, CoasterTitle, Loading, CoasterQtyAdjuster } from '@coaster/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChefHat, lucideCoffee, lucideX } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-to-serve',
  imports: [
    Loading,
    CoasterTitle,
    CoasterBtn,
    TranslatePipe,
    NgIcon,
    OrderTitlePipe,
    CoasterQtyAdjuster,
  ],
  viewProviders: [
    provideIcons({
      lucideCoffee,
      lucideCheck,
      lucideChefHat,
      lucideX,
    }),
  ],
  host: { class: 'flex flex-col gap-4' },
  templateUrl: './to-serve.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ToServe {
  public readonly barId = input.required<BarId>();

  readonly #ordersStore = inject(OrdersStore);

  readonly isLoading = signal(false);

  // Map of selected items: itemId -> { orderId, item, serveQty }
  protected readonly selectedItems = signal<Map<string, { orderId: string; item: OrderItem; serveQty: number }>>(new Map());

  protected readonly totalSelectedItemsCount = computed(() => this.selectedItems().size);

  protected readonly totalSelectedUnitsCount = computed(() => {
    return Array.from(this.selectedItems().values()).reduce((sum, val) => sum + val.serveQty, 0);
  });

  constructor() {
    effect(() => {
      const barId = this.barId();
      this.#ordersStore.setBarId(barId);
    });
  }

  // Filtered and sorted open orders with pending/unserved items
  protected readonly ordersToServe = computed(() => {
    const orders = this.#ordersStore.openOrders();
    return orders
      .map((order) => {
        const unservedItems = order.items
          .filter((item) => item.servedQuantity < item.quantity)
          .sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (aTime !== bTime) {
              return aTime - bTime;
            }
            return a.id.localeCompare(b.id);
          });

        return {
          ...order,
          items: unservedItems.map((item) => ({
            ...item,
            productName: item.productName ?? item.productId,
          })),
        };
      })
      .filter((order) => order.items.length > 0)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime; // Oldest first (FIFO queue)
      });
  });

  protected isItemSelected(itemId: string): boolean {
    return this.selectedItems().has(itemId);
  }

  protected toggleSelectItem(orderId: string, item: OrderItem) {
    const current = new Map(this.selectedItems());
    if (current.has(item.id)) {
      current.delete(item.id);
    } else {
      current.set(item.id, {
        orderId,
        item,
        serveQty: item.quantity - item.servedQuantity, // Default to all remaining
      });
    }
    this.selectedItems.set(current);
  }

  protected updateSelectedQty(itemId: string, qty: number) {
    const current = new Map(this.selectedItems());
    const val = current.get(itemId);
    if (val) {
      current.set(itemId, { ...val, serveQty: qty });
      this.selectedItems.set(current);
    }
  }

  protected clearSelection() {
    this.selectedItems.set(new Map());
  }

  // Serve selected items in bulk across orders
  protected async applySelectedChanges() {
    if (this.selectedItems().size === 0) return;

    try {
      this.isLoading.set(true);

      // Group changes by orderId
      const groups = new Map<string, BulkUpdateItemDto[]>();
      for (const [_, val] of this.selectedItems()) {
        if (!groups.has(val.orderId)) {
          groups.set(val.orderId, []);
        }
        groups.get(val.orderId)!.push({
          itemId: asOrderItemId(val.item.id),
          servedQuantity: val.item.servedQuantity + val.serveQty, // partial / full served value!
        });
      }

      // Execute bulk updates in parallel
      await Promise.all(
        Array.from(groups.entries()).map(([orderId, items]) =>
          this.#ordersStore.bulkUpdate(this.barId(), asOrderId(orderId), { items }),
        ),
      );

      this.clearSelection();
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Quick serve button action
  protected async serveSingleItem(orderId: string, item: OrderItem) {
    try {
      this.isLoading.set(true);
      await this.#ordersStore.bulkUpdate(this.barId(), asOrderId(orderId), {
        items: [
          {
            itemId: asOrderItemId(item.id),
            servedQuantity: item.quantity, // fully serve
          },
        ],
      });
      // Remove from selection if it was selected
      if (this.isItemSelected(item.id)) {
        const current = new Map(this.selectedItems());
        current.delete(item.id);
        this.selectedItems.set(current);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected formatTime(isoDate?: string): string {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

export default ToServe;
