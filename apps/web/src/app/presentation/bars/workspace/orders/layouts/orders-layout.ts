import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import type { BarId } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';

@Component({
  selector: 'coaster-main-layout',
  imports: [RouterOutlet, TranslatePipe, RouterLink, RouterLinkActive, PageContainer, PageHeader],
  template: `
    <coaster-page-container size="lg">
      <coaster-page-header [title]="'nav.orders' | translate" [subtitle]="'orders.tables_title' | translate" />

      <div
        class="flex bg-surface-container rounded-2xl p-1 gap-1 mb-6 border border-outline-variant/30 overflow-x-auto hide-scrollbar"
      >
        <a
          class="flex-1 min-w-0 text-center py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer truncate"
          [routerLink]="['/bars', barId(), 'orders', 'tables']"
          routerLinkActive="text-on-primary! bg-primary"
        >
          {{ 'orders.tables_title' | translate }}
        </a>
        <a
          class="flex-1 min-w-0 text-center py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer truncate"
          [routerLink]="['/bars', barId(), 'orders', 'to-serve']"
          routerLinkActive="text-on-primary! bg-primary"
        >
          {{ 'orders.to_serve_title' | translate }}
        </a>
        <a
          class="flex-1 min-w-0 text-center py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer truncate"
          [routerLink]="['/bars', barId(), 'orders', 'history']"
          routerLinkActive="text-on-primary! bg-primary"
        >
          {{ 'history.title' | translate }}
        </a>
      </div>

      <router-outlet />
    </coaster-page-container>
  `,
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
class OrdersLayout {
  public readonly barId = input.required<BarId>();
}

export default OrdersLayout;
