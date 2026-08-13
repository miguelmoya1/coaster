import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { AdminEstablishmentDetailStore } from '@coaster/admin';
import type { EstablishmentId, EstablishmentMemberId } from '@coaster/common';
import {
  DEFAULT_ESTABLISHMENT_MODULES,
  EstablishmentModule,
  EstablishmentRole,
  SubscriptionPlan,
  resolveModules,
} from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PricePipe } from '../../../establishments/workspace/pipes/price/price';
import { ConfirmationDialog } from '../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../components/loading/loading';
import { PageHeader } from '../../../components/page-header/page-header';
import { AuditList } from '../../components/audit-list/audit-list';
import { BillingBadge } from '../../components/billing-badge/billing-badge';
import { GrantPlanDialogService } from '../../components/grant-plan-dialog/grant-plan-dialog.service';
import { StatusChip } from '../../components/status-chip/status-chip';

@Component({
  selector: 'coaster-admin-establishment-detail',
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
    MatSlideToggle,
    TranslatePipe,
    PricePipe,
    Loading,
    PageHeader,
    AuditList,
    BillingBadge,
    StatusChip,
  ],
  templateUrl: './admin-establishment-detail.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminEstablishmentDetail {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #store = inject(AdminEstablishmentDetailStore);
  readonly #grantDialog = inject(GrantPlanDialogService);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  protected readonly establishment = this.#store.establishment;
  protected readonly settings = this.#store.settings;
  protected readonly subscription = this.#store.subscription;
  protected readonly members = this.#store.members;
  protected readonly counters = this.#store.counters;
  protected readonly recentActivity = this.#store.recentActivity;
  protected readonly isLoading = this.#store.isLoading;
  protected readonly isSaving = this.#store.isSaving;

  protected readonly moduleRows = [
    { module: EstablishmentModule.TIME_TRACKING, labelKey: 'settings.module_time_tracking', locked: true },
    { module: EstablishmentModule.ORDERS, labelKey: 'settings.module_orders', locked: false },
    { module: EstablishmentModule.INVENTORY, labelKey: 'settings.module_inventory', locked: false },
  ];

  readonly #draftModules = signal<EstablishmentModule[] | null>(null);

  protected readonly selectedModules = computed<EstablishmentModule[]>(
    () => this.#draftModules() ?? this.settings()?.modules ?? DEFAULT_ESTABLISHMENT_MODULES,
  );

  protected isModuleOn(module: EstablishmentModule): boolean {
    return this.selectedModules().includes(module);
  }

  protected isModuleForced(module: EstablishmentModule): boolean {
    return module === EstablishmentModule.INVENTORY && this.selectedModules().includes(EstablishmentModule.ORDERS);
  }

  protected async toggleModule(module: EstablishmentModule, on: boolean): Promise<void> {
    const without = this.selectedModules().filter((candidate) => candidate !== module);
    const next = resolveModules(on ? [...without, module] : without);

    this.#draftModules.set(next);
    await this.#store.updateModules(next);
    this.#draftModules.set(null);
    this.#feedback.success(this.#translate.instant('admin.establishment_detail.modules_saved'));
  }

  protected readonly assignableRoles = Object.values(EstablishmentRole);
  protected readonly isRenaming = signal(false);
  protected readonly renameValue = signal('');

  protected readonly manualGrant = computed(() => this.subscription()?.manualGrant ?? null);

  constructor() {
    effect(() => this.#store.setEstablishmentId(this.establishmentId()));
  }

  protected startRename() {
    this.renameValue.set(this.establishment()?.name ?? '');
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
      this.#feedback.error(this.#translate.instant('admin.establishment_detail.rename_too_short'));
      return;
    }

    try {
      await this.#store.rename(name);
      this.isRenaming.set(false);
      this.#feedback.success(this.#translate.instant('admin.establishment_detail.rename_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async grantPro() {
    const establishment = this.establishment();

    if (!establishment) {
      return;
    }

    const result = await this.#grantDialog.open(establishment.name);

    if (!result) {
      return;
    }

    try {
      await this.#store.grantPlan({
        plan: SubscriptionPlan.PRO,
        durationDays: result.durationDays,
        reason: result.reason || undefined,
      });
      this.#feedback.success(this.#translate.instant('admin.establishment_detail.grant_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async revokePro() {
    const establishment = this.establishment();

    if (!establishment) {
      return;
    }

    const confirmed = await this.#confirm.confirm({
      title: this.#translate.instant('admin.establishment_detail.revoke_title'),
      text: this.#translate.instant('admin.establishment_detail.revoke_text', { establishment: establishment.name }),
      confirmLabel: 'admin.establishment_detail.revoke_confirm',
    });

    if (!confirmed) {
      return;
    }

    try {
      await this.#store.revokePlan({});
      this.#feedback.success(this.#translate.instant('admin.establishment_detail.revoke_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async changeMemberRole(memberId: EstablishmentMemberId, role: EstablishmentRole) {
    try {
      await this.#store.updateMemberRole(memberId, role);
      this.#feedback.success(this.#translate.instant('admin.establishment_detail.member_role_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected enterWorkspace() {
    this.#router.navigate(['/establishments', this.establishmentId(), 'dashboard']);
  }
}
