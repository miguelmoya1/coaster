import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { AdminBarDetailStore } from '@coaster/admin';
import type { BarId, BarMemberId } from '@coaster/common';
import { BarRole, SubscriptionPlan } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PricePipe } from '../../../bars/workspace/pipes/price/price';
import { ConfirmationDialog } from '../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AuditList } from '../../components/audit-list/audit-list';
import { BillingBadge } from '../../components/billing-badge/billing-badge';
import { GrantPlanDialogService } from '../../components/grant-plan-dialog/grant-plan-dialog.service';
import { StatusChip } from '../../components/status-chip/status-chip';

@Component({
  selector: 'coaster-admin-bar-detail',
  imports: [
    DatePipe,
    MatIcon,
    MatButton,
    MatIconButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    TranslatePipe,
    PricePipe,
    Loading,
    PageHeader,
    AuditList,
    BillingBadge,
    StatusChip,
  ],
  templateUrl: './admin-bar-detail.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminBarDetail {
  public readonly barId = input.required<BarId>();

  readonly #store = inject(AdminBarDetailStore);
  readonly #grantDialog = inject(GrantPlanDialogService);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  protected readonly bar = this.#store.bar;
  protected readonly subscription = this.#store.subscription;
  protected readonly members = this.#store.members;
  protected readonly counters = this.#store.counters;
  protected readonly recentActivity = this.#store.recentActivity;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly isSaving = this.#store.isSaving;

  protected readonly assignableRoles = Object.values(BarRole);
  protected readonly isRenaming = signal(false);
  protected readonly renameValue = signal('');

  protected readonly manualGrant = computed(() => this.subscription()?.manualGrant ?? null);

  constructor() {
    effect(() => this.#store.setBarId(this.barId()));
  }

  protected startRename() {
    this.renameValue.set(this.bar()?.name ?? '');
    this.isRenaming.set(true);
  }

  protected cancelRename() {
    this.isRenaming.set(false);
  }

  protected onRenameInput(event: Event) {
    this.renameValue.set((event.target as HTMLInputElement).value);
  }

  protected async saveRename() {
    const name = this.renameValue().trim();

    if (name.length < 3) {
      this.#feedback.error(this.#translate.instant('admin.bar_detail.rename_too_short'));
      return;
    }

    try {
      await this.#store.rename(name);
      this.isRenaming.set(false);
      this.#feedback.success(this.#translate.instant('admin.bar_detail.rename_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async grantPro() {
    const bar = this.bar();

    if (!bar) {
      return;
    }

    const result = await this.#grantDialog.open(bar.name);

    if (!result) {
      return;
    }

    try {
      await this.#store.grantPlan({
        plan: SubscriptionPlan.PRO,
        durationDays: result.durationDays,
        reason: result.reason || undefined,
      });
      this.#feedback.success(this.#translate.instant('admin.bar_detail.grant_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async revokePro() {
    const bar = this.bar();

    if (!bar) {
      return;
    }

    const confirmed = await this.#confirm.confirm({
      title: this.#translate.instant('admin.bar_detail.revoke_title'),
      text: this.#translate.instant('admin.bar_detail.revoke_text', { bar: bar.name }),
      confirmLabel: 'admin.bar_detail.revoke_confirm',
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.#store.revokePlan({});
      this.#feedback.success(this.#translate.instant('admin.bar_detail.revoke_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async changeMemberRole(memberId: BarMemberId, role: BarRole) {
    try {
      await this.#store.updateMemberRole(memberId, role);
      this.#feedback.success(this.#translate.instant('admin.bar_detail.member_role_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected enterWorkspace() {
    this.#router.navigate(['/bars', this.barId(), 'dashboard']);
  }
}
