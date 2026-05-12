import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, BarMember, BarRole } from '@coaster/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { CurrentUser } from '../../../../core';
import { MembersStore } from '../../../../members';
import { BottomSheet, ConfirmDialogComponent, Fab, Loading, SectionTitle } from '../../../../shared';
import { InviteMemberForm } from './components/invite-member-form/invite-member-form';
import { StaffMemberCard } from './components/staff-member-card/staff-member-card';

@Component({
  selector: 'coaster-staff',
  imports: [Loading, StaffMemberCard, SectionTitle, BottomSheet, Fab, InviteMemberForm, TranslatePipe, RouterLink],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './staff.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {
  public readonly barId = input.required<BarId>();

  readonly #membersStore = inject(MembersStore);
  readonly #currentUser = inject(CurrentUser);
  readonly #dialog = inject(Dialog);
  readonly #translate = inject(TranslateService);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  protected readonly membersLoading = this.#membersStore.list.isLoading;
  protected readonly userMember = computed(() => {
    if (!this.#membersStore.list.hasValue()) {
      return undefined;
    }

    if (!this.#currentUser.current.hasValue()) {
      return undefined;
    }

    const user = this.#currentUser.current.value();

    return this.#membersStore.list.value().find((member) => member.userId === user?.id);
  });
  protected readonly isOwner = computed(() => this.userMember()?.role === BarRole.OWNER);
  protected readonly members = computed(() => {
    if (!this.#membersStore.list.hasValue()) {
      return [];
    }

    const userMember = this.userMember();

    return this.#membersStore.list.value().map((member) => ({
      ...member,
      showDeleteButton: this.isOwner() || userMember?.userId === member.userId,
      isCurrentUser: userMember?.userId === member.userId,
      isOnlyOwner: this.#membersStore.isOnlyOwner(),
    }));
  });
  protected readonly isInviteMode = isActive(
    createUrlTreeFromSnapshot(this.#route.parent?.snapshot ?? this.#route.snapshot, ['invite']),
    this.#router,
  );
  protected readonly totalMembers = computed(() => this.members()?.length ?? 0);

  constructor() {
    effect(() => {
      const barId = this.barId();

      this.#membersStore.setBarId(barId);
    });
  }

  protected closeModal() {
    this.#router.navigate(['/bars', this.barId(), 'staff']);
  }

  protected onDeleteMemberClicked(member: BarMember & { isCurrentUser?: boolean }) {
    const title = member.isCurrentUser
      ? this.#translate.instant('members.leave_dialog.title')
      : this.#translate.instant('members.delete.title');
    const message = member.isCurrentUser
      ? this.#translate.instant('members.leave_dialog.message')
      : this.#translate.instant('members.delete.message', { name: member.userName });

    const dialogRef = this.#dialog.open(ConfirmDialogComponent, {
      data: {
        title,
        message,
        confirmText: member.isCurrentUser ? 'members.leave' : 'common.delete',
        cancelText: 'common.cancel',
        isDestructive: true,
      },
    });

    dialogRef.closed.subscribe(async (result) => {
      if (result) {
        try {
          await this.#membersStore.remove(member.id);
        } catch (e) {
          console.error(e);
        }
      }
    });
  }
}
