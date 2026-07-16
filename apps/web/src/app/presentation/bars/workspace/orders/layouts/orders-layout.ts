import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { BarId } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'coaster-main-layout',
  imports: [RouterOutlet, TranslatePipe, RouterLink, RouterLinkActive],
  template: `
    <div class="flex bg-surface-container rounded-2xl p-1 gap-1 mb-6">
      <a
        class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        [routerLink]="['/app/bars', barId(), 'orders', 'tables']"
        routerLinkActive="text-on-primary! bg-primary"
      >
        {{ 'orders.tables_title' | translate }}
      </a>
      <a
        class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        [routerLink]="['/app/bars', barId(), 'orders', 'to-serve']"
        routerLinkActive="text-on-primary! bg-primary"
      >
        {{ 'orders.to_serve_title' | translate }}
      </a>
      <a
        class="flex-1 text-center py-2.5 rounded-xl font-bold text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        [routerLink]="['/app/bars', barId(), 'orders', 'history']"
        routerLinkActive="text-on-primary! bg-primary"
      >
        {{ 'history.title' | translate }}
      </a>
    </div>

    <router-outlet />
  `,
})
class OrdersLayout {
  public readonly barId = input.required<BarId>();
}

export default OrdersLayout;
