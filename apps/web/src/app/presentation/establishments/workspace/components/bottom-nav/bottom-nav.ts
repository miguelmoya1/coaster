import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { Component, computed, inject, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentModule, EstablishmentPermission, EstablishmentPermissionType } from '@coaster/common';
import { ModulesStore } from '@coaster/establishments';
import { TranslatePipe } from '@ngx-translate/core';
import { BottomBar } from '../bottom-bar/bottom-bar';

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
      class="fixed flex justify-around items-center h-[var(--bottom-fab-size)] bg-surface-container-high/80 backdrop-blur-2xl rounded-full z-50 shadow-elevated border border-outline-variant/20 shrink-0 px-1.5 transition-[width] duration-200"
      [style.bottom]="'var(--bottom-bar-inset)'"
      [style.left]="'calc(50vw - var(--bottom-bar-width) / 2)'"
      [style.width]="barWidth()"
    >
      @for (item of visibleNavItems(); track item.value) {
        <a
          ngToolbarWidget
          [value]="item.value"
          [routerLink]="item.link"
          [attr.aria-label]="item.labelKey | translate"
          [title]="item.labelKey | translate"
          routerLinkActive="bg-surface-bright text-primary"
          class="flex-1 min-w-0 aspect-square max-w-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-white transition-all active:scale-95 duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container"
        >
          <mat-icon class="text-xl sm:text-2xl">{{ item.icon }}</mat-icon>
        </a>
      }
    </nav>
  `,
})
export class BottomNav {
  public readonly establishmentId = input.required<string>();
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #modulesStore = inject(ModulesStore);
  readonly #bottomBar = inject(BottomBar);

  protected readonly barWidth = computed(() =>
    this.#bottomBar.hasFab()
      ? 'calc(var(--bottom-bar-width) - var(--bottom-fab-size) - var(--bottom-bar-gap))'
      : 'var(--bottom-bar-width)',
  );

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
      value: 'schedule',
      link: `/establishments/${this.establishmentId()}/schedule`,
      icon: 'calendar_today',
      labelKey: 'nav.schedule',
      requiredPermission: EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS,
    },
    {
      value: 'inventory',
      link: `/establishments/${this.establishmentId()}/inventory`,
      icon: 'inventory_2',
      labelKey: 'nav.inventory',
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
