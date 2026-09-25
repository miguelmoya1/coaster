import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import type { EstablishmentId } from '@coaster/common';
import { loadedOr, type PageResource } from '@coaster/core';
import type { Product } from '@coaster/products';
import { TranslatePipe } from '@ngx-translate/core';
import { InventoryItemCard } from '../../../../components/inventory-item-card/inventory-item-card';

@Component({
  selector: 'coaster-inventory-alerts-widget',
  imports: [TranslatePipe, MatIcon, RouterLink, InventoryItemCard],
  host: { class: 'block' },
  templateUrl: './inventory-alerts-widget.html',
})
export class InventoryAlertsWidget {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly products = input.required<PageResource<Product[]>>();

  readonly alerts = computed(() =>
    loadedOr(this.products(), [])
      .filter((p) => p.stockStatus === 'ALERT' || p.stockStatus === 'WARNING')
      .sort((a, b) => (a.stockStatus === 'ALERT' && b.stockStatus !== 'ALERT' ? -1 : 1)),
  );

  readonly visibleAlerts = computed(() => this.alerts().slice(0, 3));

  readonly hasMoreAlerts = computed(() => this.alerts().length > 3);

  readonly moreAlertsCount = computed(() => Math.max(0, this.alerts().length - 3));
}
