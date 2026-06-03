import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarsStore } from '@coaster/bars';
import type { BarId, BarMember } from '@coaster/common';
import { MembersStore } from '@coaster/members';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../../../../components/loading/loading';
import { SectionTitle } from '../../../../components/section-title/section-title';
import { BottomSheet } from '../../components/bottom-sheet/bottom-sheet';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
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
  imports: [
    Loading,
    StaffMemberCard,
    SectionTitle,
    BottomSheet,
    Fab,
    InviteMemberForm,
    TranslatePipe,
    RouterLink,
    ConfirmDialogComponent,
  ],
  host: {
    class: 'flex flex-col gap-2',
  },
  templateUrl: './staff.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Staff {
  public readonly barId = input.required<BarId>();

  readonly #membersStore = inject(MembersStore);
  readonly #barsStore = inject(BarsStore);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  protected readonly memberDeleting = signal<MemberItem | null>(null);
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

  protected handleClickDeleteMember(member: MemberItem) {
    this.memberDeleting.set(member);
  }

  protected handleCancelDeleteMember() {
    this.memberDeleting.set(null);
  }

  protected async handleConfirmDeleteMember() {
    const member = this.memberDeleting();

    if (member) {
      await this.#membersStore.remove(member.id);
      this.memberDeleting.set(null);
    }
  }
}
