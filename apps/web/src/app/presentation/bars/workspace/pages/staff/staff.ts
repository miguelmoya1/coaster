import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, createUrlTreeFromSnapshot, isActive } from '@angular/router';
import { BarId, BarMember, BarRole } from '@coaster/common';
import { TranslatePipe } from '@ngx-translate/core';
import { CurrentUser } from '../../../../../core';
import { MembersStore } from '../../../../../members';
import { BottomSheet, ConfirmDialogComponent, Fab, Loading, SectionTitle } from '../../../../../shared';
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
  readonly #currentUser = inject(CurrentUser);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);

  protected readonly memberDeleting = signal<MemberItem | null>(null);
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
