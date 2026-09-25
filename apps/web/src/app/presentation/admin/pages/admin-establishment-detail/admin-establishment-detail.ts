import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Router } from '@angular/router';
import { ManagePlatform } from '@coaster/admin';
import type { AdminEstablishmentDetail as Detail, EstablishmentId, EstablishmentMemberId } from '@coaster/common';
import {
  DEFAULT_ESTABLISHMENT_MODULES,
  EstablishmentModule,
  EstablishmentRole,
  SubscriptionPlan,
  resolveModules,
} from '@coaster/common';
import { ActionFeedback, type PageResource } from '@coaster/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CoasterInput } from '../../../components/field/input.directive';
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
    CoasterInput,
  ],
  templateUrl: './admin-establishment-detail.html',
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500',
  },
})
export default class AdminEstablishmentDetail {
  public readonly establishmentId = input.required<EstablishmentId>();
  public readonly detail = input.required<PageResource<Detail>>();

  readonly #managePlatform = inject(ManagePlatform);
  readonly #grantDialog = inject(GrantPlanDialogService);
  readonly #confirm = inject(ConfirmationDialog);
  readonly #feedback = inject(ActionFeedback);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);

  readonly #loaded = computed(() => {
    const detail = this.detail();
    return detail.hasValue() ? (detail.value() ?? null) : null;
  });

  protected readonly establishment = computed(() => this.#loaded()?.establishment ?? null);
  protected readonly settings = computed(() => this.#loaded()?.settings ?? null);
  protected readonly subscription = computed(() => this.#loaded()?.subscription ?? null);
  protected readonly members = computed(() => this.#loaded()?.members ?? []);
  protected readonly counters = computed(() => this.#loaded()?.counters ?? null);
  protected readonly recentActivity = computed(() => this.#loaded()?.recentActivity ?? []);
  protected readonly isLoading = computed(() => this.detail().isLoading());
  protected readonly isSaving = signal(false);

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
    await this.#save(() => this.#managePlatform.updateModules(this.establishmentId(), next));
    this.#draftModules.set(null);
    this.#feedback.success(this.#translate.instant('admin.establishment_detail.modules_saved'));
  }

  protected readonly assignableRoles = Object.values(EstablishmentRole);
  protected readonly isRenaming = signal(false);
  protected readonly renameValue = signal('');

  protected readonly manualGrant = computed(() => this.subscription()?.manualGrant ?? null);

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
      await this.#save(() => this.#managePlatform.rename(this.establishmentId(), name));
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
      await this.#save(() =>
        this.#managePlatform.grantPlan(this.establishmentId(), {
          plan: SubscriptionPlan.PRO,
          durationDays: result.durationDays,
          reason: result.reason || undefined,
        }),
      );
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
      await this.#save(() => this.#managePlatform.revokePlan(this.establishmentId(), {}));
      this.#feedback.success(this.#translate.instant('admin.establishment_detail.revoke_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async changeMemberRole(memberId: EstablishmentMemberId, role: EstablishmentRole) {
    try {
      await this.#save(() => this.#managePlatform.updateMemberRole(this.establishmentId(), memberId, role));
      this.#feedback.success(this.#translate.instant('admin.establishment_detail.member_role_success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  async #save(action: () => Promise<void>): Promise<void> {
    if (this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    try {
      await action();
      this.detail().reload();
    } finally {
      this.isSaving.set(false);
    }
  }

  protected enterWorkspace() {
    this.#router.navigate(['/establishments', this.establishmentId(), 'dashboard']);
  }
}
