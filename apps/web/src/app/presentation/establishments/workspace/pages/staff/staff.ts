import { Component, computed, effect, inject, input, outputBinding, signal } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ActivatedRoute, createUrlTreeFromSnapshot, isActive, Router, RouterLink } from '@angular/router';
import { MyMemberStore } from '@coaster/establishment-members';
import { EstablishmentSubscriptionStore, RequireSubscriptionDirective } from '@coaster/establishment-subscription';
import type { EstablishmentId, EstablishmentMember, EstablishmentMemberId, EstablishmentRole } from '@coaster/common';
import { EstablishmentPermission } from '@coaster/common';
import { ActionFeedback, MoneyFormatterService } from '@coaster/core';
import { MembersStore } from '@coaster/establishment-members';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../../components/loading/loading';
import { PageContainer } from '../../../../components/page-container/page-container';
import { PageHeader } from '../../../../components/page-header/page-header';
import { Fab } from '../../components/fab/fab';
import { InviteMemberForm } from './components/invite-member-form/invite-member-form';
import { StaffMemberCard } from './components/staff-member-card/staff-member-card';

type MemberItem = EstablishmentMember & {
  isCurrentUser: boolean;
  showDeleteButton: boolean;
  isOnlyOwner: boolean;
  isPending: boolean;
  canResendInvite: boolean;
  resendingInvite: boolean;
};

@Component({
  selector: 'coaster-staff',
  imports: [
    Loading,
    StaffMemberCard,
    Fab,
    TranslatePipe,
    RouterLink,
    PageContainer,
    PageHeader,
    RequireSubscriptionDirective,
  ],
  host: {
    class: 'block w-full flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500 relative',
  },
  templateUrl: './staff.html',
})
export default class Staff {
  public readonly establishmentId = input.required<EstablishmentId>();

  readonly #membersStore = inject(MembersStore);
  readonly #myMemberStore = inject(MyMemberStore);
  protected readonly router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);
  readonly #bottomSheet = inject(MatBottomSheet);
  readonly #subscriptionStore = inject(EstablishmentSubscriptionStore);
  readonly #money = inject(MoneyFormatterService);
  readonly #resendingMemberId = signal<EstablishmentMemberId | undefined>(undefined);

  protected readonly membersLoading = this.#membersStore.list.isLoading;

  protected readonly userMember = computed(() => {
    if (!this.#myMemberStore.myMember.hasValue()) {
      return undefined;
    }
    return this.#myMemberStore.myMember.value();
  });
  protected readonly isOwner = this.#myMemberStore.isOwner;
  protected readonly canChangeRole = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_UPDATE_MEMBER_ROLE),
  );
  protected readonly canInvite = computed(() =>
    this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_INVITE_MEMBER),
  );
  protected readonly members = computed(() => {
    if (!this.#membersStore.list.hasValue()) {
      return [];
    }

    const userMember = this.userMember();

    const canInvite = this.canInvite();
    const resendingMemberId = this.#resendingMemberId();

    return this.#membersStore.list.value().map((member) => {
      const isCurrentUser = userMember?.userId === member.userId;
      const isPending = member.pending === true;

      return {
        ...member,
        showDeleteButton: this.isOwner() || isCurrentUser,
        isCurrentUser,
        isOnlyOwner: this.#membersStore.isOnlyOwner(),
        isPending,
        canResendInvite: isPending && canInvite && !isCurrentUser,
        resendingInvite: resendingMemberId === member.id,
      } satisfies MemberItem;
    });
  });
  protected readonly isInviteMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['invite']),
    this.router,
  );
  protected readonly totalMembers = computed(() => this.members()?.length ?? 0);

  protected readonly seats = computed(() => {
    if (!this.#myMemberStore.hasPermission(EstablishmentPermission.ESTABLISHMENT_MANAGE_BILLING)) {
      return undefined;
    }

    const summary = this.#subscriptionStore.billedSeats();

    return summary ? { ...summary, monthlyTotal: this.#money.format(summary.monthlyTotalCents) } : undefined;
  });

  constructor() {
    effect(() => {
      const establishmentId = this.establishmentId();

      this.#membersStore.setEstablishmentId(establishmentId);
    });

    effect(() => {
      const isInviteMode = this.isInviteMode();

      if (isInviteMode) {
        const bottomSheetRef = this.#bottomSheet.open(InviteMemberForm, {
          disableClose: true,
          bindings: [
            outputBinding('canceled', () => {
              bottomSheetRef.dismiss();
              this.closeModal();
            }),
            outputBinding('invited', () => {
              bottomSheetRef.dismiss();
              this.closeModal();
            }),
          ],
        });
      }
    });
  }

  protected async handleClickDeleteMember(member: MemberItem) {
    const confirmed = await this.#confirmation.confirm({
      destructive: true,
      title: this.#translate.instant(member.isCurrentUser ? 'members.leave_dialog.title' : 'members.delete.title', {
        name: member.userName,
      }),
      text: this.#translate.instant(member.isCurrentUser ? 'members.leave_dialog.message' : 'members.delete.message', {
        name: member.userName,
      }),
      confirmLabel: member.isCurrentUser ? 'members.leave' : 'common.delete',
    });

    if (!confirmed) return;

    try {
      await this.#membersStore.remove(member.id);
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected async handleResendInvite(member: MemberItem) {
    if (this.#resendingMemberId()) return;

    this.#resendingMemberId.set(member.id);

    try {
      await this.#membersStore.resendInvite(member.id);
      this.#feedback.success(this.#translate.instant('members.resend_invite.success', { email: member.userEmail }));
    } catch (error) {
      this.#feedback.error(error);
    } finally {
      this.#resendingMemberId.set(undefined);
    }
  }

  protected async handleRoleChange(member: MemberItem, role: EstablishmentRole) {
    if (member.role === role) return;

    const confirmed = await this.#confirmation.confirm({
      title: this.#translate.instant('members.role_dialog.title'),
      text: this.#translate.instant('members.role_dialog.message', {
        name: member.userName,
        role: this.#translate.instant(`common.role.${role.toLowerCase()}`),
      }),
      confirmLabel: 'common.update',
    });

    if (!confirmed) return;

    try {
      await this.#membersStore.updateRole(member.id, role);
      this.#feedback.success(this.#translate.instant('members.role_dialog.success'));
    } catch (error) {
      this.#feedback.error(error);
    }
  }

  protected closeModal() {
    this.router.navigate(['/establishments', this.establishmentId(), 'staff']);
  }
}
