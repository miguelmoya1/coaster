import { Component, computed, effect, inject, input, outputBinding } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ActivatedRoute, createUrlTreeFromSnapshot, isActive, Router, RouterLink } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, BarMember } from '@coaster/common';
import { ActionFeedback } from '@coaster/core';
import { MembersStore } from '@coaster/members';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ConfirmationDialog } from '../../../../components/confirm-dialog/confirmation-dialog.service';
import { Loading } from '../../../../components/loading/loading';
import { Fab } from '../../components/fab/fab';
import { InviteMemberForm } from './components/invite-member-form/invite-member-form';
import { StaffMemberCard } from './components/staff-member-card/staff-member-card';

type MemberItem = BarMember & {
  isCurrentUser: boolean;
  showDeleteButton: boolean;
  isOnlyOwner: boolean;
};

@Component({
  selector: 'coaster-staff',
  imports: [Loading, StaffMemberCard, Fab, TranslatePipe, RouterLink],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './staff.html',
})
export default class Staff {
  public readonly barId = input.required<BarId>();

  readonly #membersStore = inject(MembersStore);
  readonly #barsStore = inject(BarsStore);
  protected readonly router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #confirmation = inject(ConfirmationDialog);
  readonly #translate = inject(TranslateService);
  readonly #feedback = inject(ActionFeedback);
  readonly #bottomSheet = inject(MatBottomSheet);

  protected readonly membersLoading = this.#membersStore.list.isLoading;

  protected readonly userMember = computed(() => {
    if (!this.#barsStore.myMember.hasValue()) {
      return undefined;
    }
    return this.#barsStore.myMember.value();
  });
  protected readonly isOwner = this.#barsStore.isOwner;
  protected readonly members = computed(() => {
    if (!this.#membersStore.list.hasValue()) {
      return [];
    }

    const userMember = this.userMember();

    return this.#membersStore.list.value().map(
      (member) =>
        ({
          ...member,
          showDeleteButton: this.isOwner() || userMember?.userId === member.userId,
          isCurrentUser: userMember?.userId === member.userId,
          isOnlyOwner: this.#membersStore.isOnlyOwner(),
        }) satisfies MemberItem,
    );
  });
  protected readonly isInviteMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['invite']),
    this.router,
  );
  protected readonly totalMembers = computed(() => this.members()?.length ?? 0);

  constructor() {
    effect(() => {
      const barId = this.barId();

      this.#membersStore.setBarId(barId);
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

  protected closeModal() {
    this.router.navigate(['/bars', this.barId(), 'staff']);
  }
}
