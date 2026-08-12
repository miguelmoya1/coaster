import { Component, computed, inject, input } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore, BillingAction, PlanDialogService } from '@coaster/establishment-subscription';
import type { EstablishmentId } from '@coaster/common';
import { EstablishmentPermission, ErrorCodes } from '@coaster/common';
import { ActionFeedback, ApiError, Auth, CurrentUser } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AiAssistantTrigger } from '../ai-assistant/ai-assistant-trigger';
import { AvatarBadge } from '../avatar-badge/avatar-badge';
import { ButtonSpinner } from '../../../../components/button-spinner/button-spinner';

@Component({
  selector: 'coaster-top-app-bar',
  imports: [
    ButtonSpinner,
    AiAssistantTrigger,
    AvatarBadge,
    RouterLink,
    MatButton,
    MatIconButton,
    MatIcon,
    TranslatePipe,
    MatToolbar,
    MatMenuModule,
    MatDivider,
    MatProgressSpinner,
  ],
  host: {
    class: 'block w-full z-50 shrink-0',
  },
  template: `
    <mat-toolbar
      class="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-4 sm:px-6 h-16 w-full shadow-elevated"
    >
      <div class="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 mr-4">
        @if (image(); as image) {
          <coaster-avatar-badge [imageSrc]="image" altText="User profile" class="shrink-0" />
        }

        <div class="flex items-center gap-2 sm:gap-3 truncate min-w-0">
          <h1 class="heading-1 font-black text-primary text-xl! sm:text-3xl! tracking-tighter truncate">
            {{ label() }}
          </h1>

          <div
            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] sm:text-xs font-black tracking-wider uppercase shrink-0 transition-all"
            [class]="statusBadgeTextClass()"
          >
            <span class="w-2 h-2 rounded-full shrink-0" [class]="statusDotClass()"></span>
            <span>{{ statusBadgeKey() | translate }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center shrink-0">
        @if (isAdmin()) {
          <a
            mat-icon-button
            routerLink="/admin/overview"
            [attr.aria-label]="'admin.nav.open_panel' | translate"
            [title]="'admin.nav.open_panel' | translate"
          >
            <mat-icon>admin_panel_settings</mat-icon>
          </a>
        }

        <coaster-ai-assistant-trigger [establishmentId]="establishmentId()" />

        <button mat-icon-button [matMenuTriggerFor]="menu" #menuTrigger="matMenuTrigger" aria-label="Open menu">
          <mat-icon>more_vert</mat-icon>
        </button>
      </div>

      <mat-menu #menu="matMenu" xPosition="before" class="rounded-2xl!">
        <a mat-menu-item routerLink="/establishments/select">
          <mat-icon>swap_horiz</mat-icon>
          <span>{{ 'common.change_establishment' | translate }}</span>
        </a>

        @if (canManageSettings()) {
          <a mat-menu-item [routerLink]="['/establishments', establishmentId(), 'settings']">
            <mat-icon>tune</mat-icon>
            <span>{{ 'settings.title' | translate }}</span>
          </a>
        }

        @if (canManageBilling() && showBillingAction()) {
          @if (billingAction() === BillingAction.MANAGE) {
            <button
              mat-menu-item
              [disabled]="isOpeningBillingPortal()"
              [attr.aria-busy]="isOpeningBillingPortal()"
              (click)="manageBilling(); menuTrigger.closeMenu()"
            >
              @if (isOpeningBillingPortal()) {
                <coaster-button-spinner />
              } @else {
                <mat-icon>receipt_long</mat-icon>
              }
              <span>{{ 'billing.manage_billing' | translate }}</span>
            </button>
          } @else {
            <button mat-menu-item (click)="activatePro(); menuTrigger.closeMenu()">
              <mat-icon>rocket_launch</mat-icon>
              <span>{{ 'billing.activate_pro_title' | translate }}</span>
            </button>
          }
        }

        <mat-divider />

        <div class="px-4 py-2 flex flex-col gap-2 outline-none">
          <div class="flex items-center gap-2 text-xs font-bold tracking-wider text-on-surface-variant/60 uppercase">
            <mat-icon class="text-xs">public</mat-icon>
            <span>{{ 'common.language' | translate }}</span>
          </div>

          <div class="grid grid-cols-2 gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/20">
            @if (currentLang() === 'es') {
              <button mat-flat-button (click)="setLanguage('es'); menuTrigger.closeMenu()">ES</button>
            } @else {
              <button mat-button (click)="setLanguage('es'); menuTrigger.closeMenu()">ES</button>
            }
            @if (currentLang() === 'en') {
              <button mat-flat-button (click)="setLanguage('en'); menuTrigger.closeMenu()">EN</button>
            } @else {
              <button mat-button (click)="setLanguage('en'); menuTrigger.closeMenu()">EN</button>
            }
          </div>
        </div>

        <mat-divider />

        <button mat-menu-item (click)="logout()" class="text-error!">
          <mat-icon class="text-error!">logout</mat-icon>
          <span>{{ 'common.logout' | translate }}</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
})
export class TopAppBar {
  readonly establishmentId = input.required<EstablishmentId>();
  readonly label = input.required<string>();
  readonly image = input.required<string>();

  readonly #auth = inject(Auth);
  readonly #currentUser = inject(CurrentUser);
  readonly #myMemberStore = inject(MyMemberStore);
  readonly #establishmentSubscriptionStore = inject(EstablishmentSubscriptionStore);
  readonly #router = inject(Router);
  readonly #translate = inject(TranslateService);
  readonly #actionFeedback = inject(ActionFeedback);
  readonly #planDialogService = inject(PlanDialogService);

  readonly currentLang = this.#translate.currentLang;
  readonly isAdmin = this.#currentUser.isAdmin;
  readonly canManageSettings = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_SETTINGS),
  );
  readonly canManageBilling = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING),
  );
  readonly subscription = computed(() => this.#establishmentSubscriptionStore.subscription.value());
  readonly billingAction = this.#establishmentSubscriptionStore.billingAction;
  readonly isOpeningBillingPortal = this.#establishmentSubscriptionStore.isOpeningBillingPortal;
  readonly showBillingAction = this.#establishmentSubscriptionStore.showBillingAction;
  readonly BillingAction = BillingAction;

  readonly isProActive = computed(() => {
    return this.billingAction() === BillingAction.MANAGE;
  });

  readonly isPendingCancel = computed(() => {
    const sub = this.subscription();
    if (!sub) return false;
    if (sub.status === 'CANCELED') {
      if (!sub.currentPeriodEnd) return true;
      return new Date() <= new Date(sub.currentPeriodEnd);
    }
    return false;
  });

  readonly statusDotClass = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'bg-zinc-400';
    if (this.isPendingCancel()) {
      return 'bg-secondary shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
      case 'TRIALING':
        return 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'bg-secondary animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      default:
        return 'bg-zinc-400';
    }
  });

  readonly statusBadgeKey = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'billing.status_badge.free';
    if (this.isPendingCancel()) {
      return 'billing.status_badge.cancel_at_period_end';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'billing.status_badge.active';
      case 'TRIALING':
        return 'billing.status_badge.trialing';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'billing.status_badge.past_due';
      default:
        return 'billing.status_badge.free';
    }
  });

  readonly statusBadgeTextClass = computed(() => {
    const sub = this.subscription();
    if (!sub) return 'text-on-surface-variant/70 bg-surface-container border-outline-variant/30';
    if (this.isPendingCancel()) {
      return 'text-secondary bg-secondary/10 border-secondary/20';
    }
    switch (sub.status) {
      case 'ACTIVE':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'TRIALING':
        return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'PAST_DUE':
      case 'UNPAID':
        return 'text-secondary bg-secondary/10 border-secondary/20';
      default:
        return 'text-on-surface-variant/70 bg-surface-container border-outline-variant/30';
    }
  });

  setLanguage(lang: string): void {
    if (this.#auth.isAuthenticated()) {
      this.#translate.use(lang);
      this.#currentUser.updateLanguage(lang);
    }
  }

  async logout(): Promise<void> {
    await this.#auth.logout();
    await this.#router.navigate(['/login'], { replaceUrl: true });
  }

  async manageBilling(): Promise<void> {
    if (this.isOpeningBillingPortal()) {
      return;
    }

    try {
      const portalUrl = await this.#establishmentSubscriptionStore.createCustomerPortalSession();

      if (portalUrl) {
        window.location.assign(portalUrl);
      } else {
        this.#actionFeedback.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    } catch (error) {
      if (!(error instanceof ApiError)) {
        this.#actionFeedback.error(ErrorCodes.STRIPE_BILLING_PORTAL_FAILED);
      }
    }
  }

  activatePro(): void {
    this.#planDialogService.open(this.establishmentId());
  }
}
