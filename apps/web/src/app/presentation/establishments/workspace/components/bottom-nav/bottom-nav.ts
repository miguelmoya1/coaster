import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentModule, EstablishmentPermission, EstablishmentPermissionType } from '@coaster/common';
import { ModulesStore } from '@coaster/establishments';
import { TranslatePipe } from '@ngx-translate/core';

interface NavItem {
  value: string;
  link: string;
  icon: string;
  labelKey: string;
  requiredPermission?: EstablishmentPermissionType;
  requiredModule?: EstablishmentModule;
}

@Component({
  selector: 'coaster-bottom-nav',
  imports: [MatIcon, Toolbar, ToolbarWidget, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <nav
      ngToolbar
      orientation="horizontal"
      class="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md flex justify-around items-center h-16 bg-surface-container-high/80 backdrop-blur-2xl rounded-full z-50 shadow-elevated border border-outline-variant/20 shrink-0"
    >
      @for (item of visibleNavItems(); track item.value) {
        <a
          ngToolbarWidget
          [value]="item.value"
          [routerLink]="item.link"
          routerLinkActive="bg-surface-bright text-primary rounded-2xl scale-105 sm:scale-110"
          class="flex flex-col items-center justify-center text-on-surface-variant px-3 sm:px-5 py-1.5 sm:py-2 hover:text-white transition-all active:scale-95 duration-150 gap-0 sm:gap-1 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
        >
          <mat-icon class="text-xl sm:text-2xl">{{ item.icon }}</mat-icon>
          <span class="font-bold text-xxs sm:text-xxs-plus uppercase tracking-wider hidden sm:block">
            {{ item.labelKey | translate }}
          </span>
        </a>
      }
    </nav>
  `,
})
export class BottomNav {
  public readonly establishmentId = input.required<string>();
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #modulesStore = inject(ModulesStore);

  private readonly allNavItems = computed<NavItem[]>(() => [
    {
      value: 'dashboard',
      link: `/establishments/${this.establishmentId()}/dashboard`,
      icon: 'dashboard',
      labelKey: 'nav.dashboard',
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_DASHBOARD,
    },
    {
      value: 'orders',
      link: `/establishments/${this.establishmentId()}/orders`,
      icon: 'assignment',
      labelKey: 'nav.orders',
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS,
      requiredModule: EstablishmentModule.ORDERS,
    },
    {
      value: 'roster',
      link: `/establishments/${this.establishmentId()}/roster`,
      icon: 'calendar_today',
      labelKey: 'nav.roster',
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS,
    },
    {
      value: 'pantry',
      link: `/establishments/${this.establishmentId()}/pantry`,
      icon: 'inventory_2',
      labelKey: 'nav.pantry',
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS,
      requiredModule: EstablishmentModule.INVENTORY,
    },
    {
      value: 'staff',
      link: `/establishments/${this.establishmentId()}/staff`,
      icon: 'group',
      labelKey: 'nav.staff',
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER,
    },
  ]);

  protected readonly visibleNavItems = computed(() =>
    this.allNavItems().filter(
      (item) =>
        (!item.requiredPermission || this.#myMemberStore.hasPermission(item.requiredPermission)) &&
        (!item.requiredModule || this.#modulesStore.isModuleEnabled(item.requiredModule)),
    ),
  );
}
